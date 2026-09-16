import { discoverTools, invokeForEvidence, type DiscoveredTool } from "@/lib/mcp/client";
import { decideToolExecution } from "./policy";
import type { Evidence, ResearchSession, TraceEvent } from "./contracts";
import { chooseTool, createPlan, synthesize } from "./model";

const DEFAULT_QUESTION = "Compare approaches for running coding agents against local LLMs with 12–16 GB VRAM.";
const STANDARD_LIMITS = { iterations: 6, toolCalls: 5, costUsd: 0.25 };
const EXTENDED_LIMITS = { iterations: 10, toolCalls: 8, costUsd: 0.5 };

const event = (kind: TraceEvent["kind"], message: string, status: TraceEvent["status"] = "complete", detail?: string): TraceEvent => ({ id: crypto.randomUUID(), at: new Date().toISOString(), kind, message, status, detail });
export type ResearchRunOptions = { onTrace?: (trace: TraceEvent) => void; depth?: "standard" | "extended"; sourceTarget?: number };

export async function runResearch(question = DEFAULT_QUESTION, options: ResearchRunOptions = {}): Promise<ResearchSession> {
  const baselineLimits = options.depth === "extended" ? EXTENDED_LIMITS : STANDARD_LIMITS;
  const sourceTarget = Math.max(2, Math.min(10, Math.floor(options.sourceTarget || 5)));
  const limits = { iterations: Math.min(14, Math.max(baselineLimits.iterations, sourceTarget + 2)), toolCalls: Math.min(12, Math.max(baselineLimits.toolCalls, sourceTarget)), costUsd: Math.max(baselineLimits.costUsd, Math.min(0.75, sourceTarget * 0.08)) };
  const started = Date.now();
  const trace: TraceEvent[] = [];
  const add = (kind: TraceEvent["kind"], message: string, status: TraceEvent["status"] = "complete", detail?: string) => { const item = event(kind, message, status, detail); trace.push(item); options.onTrace?.(item); return item; };
  add("plan", `${options.depth === "extended" ? "Starting an extended research pass" : "Starting a research pass"} with a target of about ${sourceTarget} distinct validated sources.`);
  const objectives = await createPlan(question);
  add("plan", `Created ${objectives.length} research objectives.`, "complete", objectives.join(" · "));
  const tools = await discoverTools();
  add("plan", `Dynamically discovered ${tools.length} MCP tools across ${new Set(tools.map((tool) => tool.server)).size} server(s).`);
  const researchTools = tools.filter((tool) => tool.server !== "local-research-corpus");
  const eligibleTools = researchTools.length ? researchTools : tools;
  if (researchTools.length) add("plan", "Using live research MCP tools; local test corpus held in reserve.");
  const evidence: Evidence[] = [];
  let calls = 0; let iterations = 1; let spent = 0; let distinctSourceCount = 0;
  while (calls < limits.toolCalls && iterations < limits.iterations && distinctSourceCount < sourceTarget) {
    const selection = await chooseTool(question, eligibleTools);
    if (!selection) break;
    const { tool } = selection;
    if (calls >= limits.toolCalls || iterations >= limits.iterations) break;
    const decision = decideToolExecution(tool, spent, limits.costUsd);
    if (!decision.allowed) { add("approval", `${tool.name} paused for approval.`, "blocked", decision.reason); continue; }
    const step = add("tool", `Calling ${tool.name} through ${tool.server} to reach the ${sourceTarget}-source target.`);
    try {
      const records = await invokeForEvidence(tool, selection.arguments, step.id);
      evidence.push(...records); calls++; iterations++; spent += tool.estimatedCostUsd;
      distinctSourceCount = evidence.filter((record, index, records) => records.findIndex((candidate) => candidate.sourceUrl === record.sourceUrl) === index).length;
      add("evaluation", `Validated ${records.length} evidence record(s) from ${tool.name}. ${distinctSourceCount} of about ${sourceTarget} distinct sources gathered.`);
    } catch (error) { add("recovery", `${tool.name} did not return a valid result; continuing with other sources.`, "warning", error instanceof Error ? error.message : "Unknown tool failure"); }
  }
  const unsupported = tools.find((tool) => !tool.readOnly);
  if (unsupported) add("approval", `${unsupported.name} was not invoked.`, "blocked", "Mutating or paid actions are always approval-gated.");
  const uniqueEvidence = evidence.filter((record, index, records) => records.findIndex((other) => other.sourceUrl === record.sourceUrl) === index);
  add("evaluation", `Compared overlapping findings and retained ${uniqueEvidence.length} distinct sources${uniqueEvidence.length < sourceTarget ? `, below the requested target of ${sourceTarget} because the safe research limit was reached.` : "."}`);
  add("synthesis", "Asking the model to synthesize evidence-backed conclusions.");
  const report = await synthesize(question, uniqueEvidence);
  add("synthesis", "Generated an evidence-backed report with statement-level provenance.");
  await Promise.all([...new Set(tools.map((tool) => tool.transport))].map((transport) => transport.close?.()));
  return { id: crypto.randomUUID(), question, status: uniqueEvidence.length ? "complete" : "partial", objectives, evidence: uniqueEvidence, trace, report: { summary: report.summary, claims: report.claims.map((claim) => ({ ...claim, id: crypto.randomUUID() })), limitations: report.limitations }, budget: { iterationsUsed: iterations, toolCallsUsed: calls, maxIterations: limits.iterations, maxToolCalls: limits.toolCalls, elapsedMs: Date.now() - started } };
}
