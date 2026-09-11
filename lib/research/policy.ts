import type { DiscoveredTool } from "@/lib/mcp/client";

export type ToolDecision = { allowed: true } | { allowed: false; reason: string };
export function decideToolExecution(tool: DiscoveredTool, spentUsd: number, maxCostUsd: number): ToolDecision {
  if (!tool.readOnly) return { allowed: false, reason: "This tool can change an external system and needs human approval." };
  if (spentUsd + tool.estimatedCostUsd > maxCostUsd) return { allowed: false, reason: "Executing this tool would exceed the session cost budget." };
  return { allowed: true };
}
