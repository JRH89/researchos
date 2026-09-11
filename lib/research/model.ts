import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { DiscoveredTool } from "@/lib/mcp/client";
import type { Claim, Evidence } from "./contracts";

const planSchema = z.object({ objectives: z.array(z.string().min(1)).min(2) });
const callSchema = z.object({ toolName: z.string(), arguments: z.record(z.string(), z.unknown()) });
const reportSchema = z.object({ summary: z.string().min(1), claims: z.array(z.object({ text: z.string().min(1), confidence: z.enum(["high", "medium", "low"]), evidenceIds: z.array(z.string()).min(1) })), limitations: z.array(z.string()) });
const noEmDashRule = "Never use an em dash (—). Use a period, comma, colon, semicolon, or parentheses instead.";
const formalResearchVoice = "Use a formal, precise, professional research voice. Be direct, evidence-led, and free of conversational filler.";
const studentEssayVoice = "Use a clear, natural college-student academic voice. Sound thoughtful and credible without corporate jargon, inflated language, or an artificial expert persona.";

export function removeEmDashes(text: string) {
  return text.replace(/\s*—\s*/g, ", ").replace(/—/g, "-");
}

function client() { const apiKey = process.env.OPENAI_API_KEY; return apiKey ? new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL || undefined }) : undefined; }
function claude() { const apiKey = process.env.ANTHROPIC_API_KEY; return apiKey ? new Anthropic({ apiKey }) : undefined; }
function responseSchema(name: string): Anthropic.Tool.InputSchema {
  const stringList = { type: "array", items: { type: "string" } };
  if (name === "research_plan") return { type: "object", properties: { objectives: stringList }, required: ["objectives"], additionalProperties: false };
  if (name === "tool_call") return { type: "object", properties: { toolName: { type: "string" }, arguments: { type: "object", additionalProperties: true } }, required: ["toolName", "arguments"], additionalProperties: false };
  return { type: "object", properties: { summary: { type: "string" }, claims: { type: "array", items: { type: "object", properties: { text: { type: "string" }, confidence: { type: "string", enum: ["high", "medium", "low"] }, evidenceIds: stringList }, required: ["text", "confidence", "evidenceIds"], additionalProperties: false } }, limitations: stringList }, required: ["summary", "claims", "limitations"], additionalProperties: false };
}
async function structured<T>(name: string, schema: z.ZodType<T>, prompt: string): Promise<T | undefined> {
  const governedPrompt = `${prompt}\n\nGlobal style rule: ${noEmDashRule}`;
  const anthropic = claude();
  if (anthropic) {
    const response = await anthropic.messages.create({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929", max_tokens: 2048, messages: [{ role: "user", content: governedPrompt }], tools: [{ name: "emit_result", description: "Return the requested structured result.", input_schema: responseSchema(name) }], tool_choice: { type: "tool", name: "emit_result" } });
    const result = response.content.find((block) => block.type === "tool_use" && block.name === "emit_result");
    if (!result || result.type !== "tool_use") throw new Error("Claude did not return the required structured result.");
    return schema.parse(result.input);
  }
  const api = client(); if (!api) return undefined;
  const response = await api.responses.create({ model: process.env.OPENAI_MODEL || "gpt-5-mini", input: governedPrompt, text: { format: { type: "json_schema", name, strict: true, schema: responseSchema(name) } } });
  return schema.parse(JSON.parse(response.output_text));
}

export async function createPlan(question: string) {
  const objectives = (await structured("research_plan", planSchema, `You are a technical research planner. Create focused, source-verifiable objectives for this question. Return JSON only. Question: ${question}`))?.objectives;
  return objectives?.slice(0, 6).map(removeEmDashes) ?? ["Define the constraints", "Find primary technical documentation", "Compare viable implementation approaches", "Corroborate critical claims", "Synthesize evidence-backed recommendations"];
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
  const result = await structured("research_report", reportSchema, `Write a concise technical report answering the question using only the evidence supplied. ${formalResearchVoice} Every claim must cite one or more supplied evidence IDs. Do not invent facts. Return JSON only. Question: ${question}\nEvidence: ${JSON.stringify(compact)}`);
  if (result?.claims.length) return { summary: removeEmDashes(result.summary), claims: result.claims.slice(0, 6).map((claim) => ({ ...claim, text: removeEmDashes(claim.text) })), limitations: result.limitations.slice(0, 5).map(removeEmDashes) };
  return { summary: "Research completed from the connected sources. Review each claim's evidence chain before acting on the result.", claims: evidence.slice(0, 3).map((item) => ({ text: item.excerpt, confidence: "medium" as const, evidenceIds: [item.id] })), limitations: ["No LLM adapter is configured, so this fallback preserves source excerpts instead of generating interpretive synthesis."] };
}

export async function writePaperBody(input: { title: string; paperType: "research-paper" | "essay"; citationStyle: "APA" | "MLA"; targetWordCount: number; researchQuestions?: string[]; evidence: Evidence[] }): Promise<string> {
  const citation = (item: Evidence) => input.citationStyle === "APA" ? `(${item.authors?.[0]?.split(" ").at(-1) || `“${item.sourceTitle}”`}, ${item.publishedDate?.slice(0, 4) || "n.d."})` : `(${item.authors?.[0]?.split(" ").at(-1) || `“${item.sourceTitle}”`})`;
  const sources = input.evidence.map((item, index) => `[${index + 1}] Cite in text as ${citation(item)}\nTitle: ${item.sourceTitle}\nAuthor: ${item.authors?.join(", ") || "not supplied"}\nDate: ${item.publishedDate || "not supplied"}\nPublisher/site: ${item.publisher || item.siteName || "not supplied"}\nURL: ${item.sourceUrl}\nEvidence: ${item.excerpt}`).join("\n\n");
  const abstractRule = input.paperType === "research-paper" ? "Start with a concise `## Abstract` section, then write the body." : "Do not include an abstract.";
  const voiceRule = input.paperType === "essay" ? studentEssayVoice : formalResearchVoice;
  const prompt = `Write the complete body of a ${input.citationStyle}-style ${input.paperType === "essay" ? "academic essay" : "research paper"} titled "${input.title}". ${abstractRule}

Write approximately ${input.targetWordCount} words. ${voiceRule} ${noEmDashRule} This must read as connected academic prose: an introduction with a clear thesis, multiple developed body paragraphs that compare or explain the evidence, and a conclusion. Do not produce a list of claims, an outline, a Findings heading, or a Limitations section. Cite factual statements using the supplied style-specific in-text forms. Do not invent facts, source metadata, or citations. Do not include the title, student heading, References, or Works Cited; those are added separately. When multiple research runs are selected, address each of their questions rather than over-focusing on one.

Selected research questions: ${input.researchQuestions?.join(" | ") || input.title}

Sources:\n${sources}`;
  const anthropic = claude();
  if (anthropic) {
    const response = await anthropic.messages.create({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929", max_tokens: Math.min(8000, Math.max(1600, Math.ceil(input.targetWordCount * 2))), messages: [{ role: "user", content: prompt }] });
    const text = response.content.filter((block) => block.type === "text").map((block) => block.text).join("\n").trim();
    if (text) return removeEmDashes(text);
  }
  const api = client();
  if (api) { const response = await api.responses.create({ model: process.env.OPENAI_MODEL || "gpt-5-mini", input: prompt }); if (response.output_text.trim()) return removeEmDashes(response.output_text.trim()); }
  const cite = (item: Evidence) => input.citationStyle === "APA" ? `(${item.authors?.[0]?.split(" ").at(-1) || `“${item.sourceTitle}”`}, ${item.publishedDate?.slice(0, 4) || "n.d."})` : `(${item.authors?.[0]?.split(" ").at(-1) || `“${item.sourceTitle}”`})`;
  const paragraphs = input.evidence.slice(0, 4).map((item) => `The available evidence supports a key part of this discussion: ${item.excerpt} ${cite(item)}.`);
  return removeEmDashes(`${input.paperType === "research-paper" ? "## Abstract\n\nThis paper synthesizes the available source evidence and identifies its practical implications.\n\n" : ""}## Introduction\n\nThis essay examines ${input.title.toLowerCase()} using the available evidence.\n\n${paragraphs.join("\n\n")}\n\n## Conclusion\n\nThe available sources support these findings, though readers should weigh their limitations before applying them.`);
}
