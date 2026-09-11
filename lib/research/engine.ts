import { discoverTools, invokeForEvidence, type DiscoveredTool } from "@/lib/mcp/client";
import { decideToolExecution } from "./policy";
import type { Evidence, ResearchSession, TraceEvent } from "./contracts";
import { chooseTool, createPlan, synthesize } from "./model";

const DEFAULT_QUESTION = "Compare approaches for running coding agents against local LLMs with 12–16 GB VRAM.";
const MAX_ITERATIONS = 6;
const MAX_TOOL_CALLS = 5;
const MAX_COST_USD = 0.25;

const event = (kind: TraceEvent["kind"], message: string, status: TraceEvent["status"] = "complete", detail?: string): TraceEvent => ({ id: crypto.randomUUID(), at: new Date().toISOString(), kind, message, status, detail });
export type ResearchRunOptions = { onTrace?: (trace: TraceEvent) => void };

export async function runResearch(question = DEFAULT_QUESTION, options: ResearchRunOptions = {}): Promise<ResearchSession> {
  const started = Date.now();
  const trace: TraceEvent[] = [];
  const add = (kind: TraceEvent["kind"], message: string, status: TraceEvent["status"] = "complete", detail?: string) => { const item = event(kind, message, status, detail); trace.push(item); options.onTrace?.(item); return item; };
  add("plan", "Asking the model to plan the research run.");
  const objectives = await createPlan(question);
  add("plan", `Created ${objectives.length} research objectives.`, "complete", objectives.join(" · "));
  const tools = await discoverTools();
  add("plan", `Dynamically discovered ${tools.length} MCP tools across ${new Set(tools.map((tool) => tool.server)).size} server(s).`);
  const evidence: Evidence[] = [];
  let calls = 0; let iterations = 1; let spent = 0;
  const usedTools = new Set<string>();
  while (calls < MAX_TOOL_CALLS && iterations < MAX_ITERATIONS) {
    const selection = await chooseTool(question, tools.filter((tool) => !usedTools.has(`${tool.server}:${tool.name}`)));
    if (!selection) break;
    const { tool } = selection;
    if (calls >= MAX_TOOL_CALLS || iterations >= MAX_ITERATIONS) break;
    const decision = decideToolExecution(tool, spent, MAX_COST_USD);
    if (!decision.allowed) { add("approval", `${tool.name} paused for approval.`, "blocked", decision.reason); continue; }
    const step = add("tool", `Calling ${tool.name} through ${tool.server}.`); usedTools.add(`${tool.server}:${tool.name}`);
    try {
      const records = await invokeForEvidence(tool, selection.arguments, step.id);
      evidence.push(...records); calls++; iterations++; spent += tool.estimatedCostUsd;
      add("evaluation", `Validated ${records.length} evidence record(s) from ${tool.name}.`);
    } catch (error) { add("recovery", `${tool.name} did not return a valid result; continuing with other sources.`, "warning", error instanceof Error ? error.message : "Unknown tool failure"); }
  }
  const unsupported = tools.find((tool) => !tool.readOnly);
  if (unsupported) add("approval", `${unsupported.name} was not invoked.`, "blocked", "Mutating or paid actions are always approval-gated.");
  const uniqueEvidence = evidence.filter((record, index, records) => records.findIndex((other) => other.sourceUrl === record.sourceUrl) === index);
  add("evaluation", `Compared overlapping findings and retained ${uniqueEvidence.length} distinct sources.`);
  add("synthesis", "Asking the model to synthesize evidence-backed conclusions.");
  const report = await synthesize(question, uniqueEvidence);
  add("synthesis", "Generated an evidence-backed report with statement-level provenance.");
  await Promise.all([...new Set(tools.map((tool) => tool.transport))].map((transport) => transport.close?.()));
  return { id: crypto.randomUUID(), question, status: uniqueEvidence.length ? "complete" : "partial", objectives, evidence: uniqueEvidence, trace, report: { summary: report.summary, claims: report.claims.map((claim) => ({ ...claim, id: crypto.randomUUID() })), limitations: report.limitations }, budget: { iterationsUsed: iterations, toolCallsUsed: calls, maxIterations: MAX_ITERATIONS, maxToolCalls: MAX_TOOL_CALLS, elapsedMs: Date.now() - started } };
}
