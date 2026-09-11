import { z } from "zod";

export const toolDefinitionSchema = z.object({
  name: z.string().min(1), description: z.string().min(1), readOnly: z.boolean(), estimatedCostUsd: z.number().nonnegative().default(0)
});
export type ToolDefinition = z.infer<typeof toolDefinitionSchema>;

export const evidenceSchema = z.object({
  id: z.string(), sourceTitle: z.string(), sourceUrl: z.string().url(), excerpt: z.string().min(1), authors: z.array(z.string()).optional(), publishedDate: z.string().optional(), publisher: z.string().optional(), siteName: z.string().optional(), retrievedAt: z.string(), server: z.string(), toolCallId: z.string(), traceStepId: z.string()
});
export type Evidence = z.infer<typeof evidenceSchema>;

export type TraceEvent = { id: string; at: string; kind: "plan" | "tool" | "evaluation" | "approval" | "recovery" | "synthesis"; message: string; detail?: string; status: "complete" | "warning" | "blocked" };
export type Claim = { id: string; text: string; confidence: "high" | "medium" | "low"; evidenceIds: string[] };
export type ResearchSession = { id: string; question: string; status: "complete" | "needs-approval" | "partial" | "failed"; objectives: string[]; report: { summary: string; claims: Claim[]; limitations: string[] }; trace: TraceEvent[]; evidence: Evidence[]; budget: { iterationsUsed: number; toolCallsUsed: number; maxIterations: number; maxToolCalls: number; elapsedMs: number } };

export const rawToolResultSchema = z.object({ sources: z.array(z.object({ title: z.string(), url: z.string().url(), excerpt: z.string().min(1), authors: z.array(z.string()).optional(), publishedDate: z.string().optional(), publisher: z.string().optional(), siteName: z.string().optional() })).min(1) });
