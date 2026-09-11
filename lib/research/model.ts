import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { DiscoveredTool } from "@/lib/mcp/client";
import type { Claim, Evidence } from "./contracts";

const planSchema = z.object({ objectives: z.array(z.string().min(1)).min(2) });
const callSchema = z.object({ toolName: z.string(), arguments: z.record(z.string(), z.unknown()) });
const reportSchema = z.object({ summary: z.string().min(1), claims: z.array(z.object({ text: z.string().min(1), confidence: z.enum(["high", "medium", "low"]), evidenceIds: z.array(z.string()).min(1) })), limitations: z.array(z.string()) });

function client() { const apiKey = process.env.OPENAI_API_KEY; return apiKey ? new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL || undefined }) : undefined; }
function claude() { const apiKey = process.env.ANTHROPIC_API_KEY; return apiKey ? new Anthropic({ apiKey }) : undefined; }
function responseSchema(name: string): Anthropic.Tool.InputSchema {
  const stringList = { type: "array", items: { type: "string" } };
  if (name === "research_plan") return { type: "object", properties: { objectives: stringList }, required: ["objectives"], additionalProperties: false };
  if (name === "tool_call") return { type: "object", properties: { toolName: { type: "string" }, arguments: { type: "object", additionalProperties: true } }, required: ["toolName", "arguments"], additionalProperties: false };
  return { type: "object", properties: { summary: { type: "string" }, claims: { type: "array", items: { type: "object", properties: { text: { type: "string" }, confidence: { type: "string", enum: ["high", "medium", "low"] }, evidenceIds: stringList }, required: ["text", "confidence", "evidenceIds"], additionalProperties: false } }, limitations: stringList }, required: ["summary", "claims", "limitations"], additionalProperties: false };
}
async function structured<T>(name: string, schema: z.ZodType<T>, prompt: string): Promise<T | undefined> {
  const anthropic = claude();
  if (anthropic) {
    const response = await anthropic.messages.create({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929", max_tokens: 2048, messages: [{ role: "user", content: prompt }], tools: [{ name: "emit_result", description: "Return the requested structured result.", input_schema: responseSchema(name) }], tool_choice: { type: "tool", name: "emit_result" } });
    const result = response.content.find((block) => block.type === "tool_use" && block.name === "emit_result");
    if (!result || result.type !== "tool_use") throw new Error("Claude did not return the required structured result.");
    return schema.parse(result.input);
  }
  const api = client(); if (!api) return undefined;
  const response = await api.responses.create({ model: process.env.OPENAI_MODEL || "gpt-5-mini", input: prompt, text: { format: { type: "json_schema", name, strict: true, schema: responseSchema(name) } } });
  return schema.parse(JSON.parse(response.output_text));
}

export async function createPlan(question: string) {
  const objectives = (await structured("research_plan", planSchema, `You are a technical research planner. Create focused, source-verifiable objectives for this question. Return JSON only. Question: ${question}`))?.objectives;
  return objectives?.slice(0, 6) ?? ["Define the constraints", "Find primary technical documentation", "Compare viable implementation approaches", "Corroborate critical claims", "Synthesize evidence-backed recommendations"];
}

export async function chooseTool(question: string, tools: DiscoveredTool[]) {
  const readable = tools.filter((tool) => tool.readOnly);
  if (!readable.length) return undefined;
  const catalog = readable.map((tool) => ({ name: tool.name, description: tool.description, server: tool.server }));
  const choice = await structured("tool_call", callSchema, `Choose one read-only MCP tool and valid JSON arguments to research this question. Only use a listed tool. Return JSON only. Question: ${question}\nTools: ${JSON.stringify(catalog)}`);
  const chosen = readable.find((tool) => tool.name === choice?.toolName);
  return chosen && choice ? { tool: chosen, arguments: choice.arguments } : { tool: readable[0], arguments: { query: question } };
}

export async function synthesize(question: string, evidence: Evidence[]): Promise<{ summary: string; claims: Omit<Claim, "id">[]; limitations: string[] }> {
  const compact = evidence.map((item) => ({ id: item.id, title: item.sourceTitle, url: item.sourceUrl, excerpt: item.excerpt }));
  const result = await structured("research_report", reportSchema, `Write a concise technical report answering the question using only the evidence supplied. Every claim must cite one or more supplied evidence IDs. Do not invent facts. Return JSON only. Question: ${question}\nEvidence: ${JSON.stringify(compact)}`);
  if (result?.claims.length) return { ...result, claims: result.claims.slice(0, 6), limitations: result.limitations.slice(0, 5) };
  return { summary: "Research completed from the connected sources. Review each claim's evidence chain before acting on the result.", claims: evidence.slice(0, 3).map((item) => ({ text: item.excerpt, confidence: "medium" as const, evidenceIds: [item.id] })), limitations: ["No LLM adapter is configured, so this fallback preserves source excerpts instead of generating interpretive synthesis."] };
}
