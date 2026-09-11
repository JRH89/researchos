import { rawToolResultSchema, toolDefinitionSchema, type Evidence } from "@/lib/research/contracts";
import { configuredTransports } from "./registry";
import type { MCPTransport } from "./transport";

export type DiscoveredTool = ReturnType<typeof toolDefinitionSchema.parse> & { server: string; transport: MCPTransport };

export async function discoverTools(): Promise<DiscoveredTool[]> {
  const entries = await Promise.all(configuredTransports().map(async (transport) => {
    const tools = await transport.listTools();
    return tools.map((tool) => ({ ...toolDefinitionSchema.parse(tool), server: transport.serverName, transport }));
  }));
  return entries.flat();
}

export async function invokeForEvidence(tool: DiscoveredTool, input: Record<string, unknown>, traceStepId: string): Promise<Evidence[]> {
  const toolCallId = crypto.randomUUID();
  const result = rawToolResultSchema.parse(normalizeToolResult(await tool.transport.callTool(tool.name, input)));
  return result.sources.map((source) => ({ id: crypto.randomUUID(), sourceTitle: source.title, sourceUrl: source.url, excerpt: source.excerpt, retrievedAt: new Date().toISOString(), server: tool.server, toolCallId, traceStepId }));
}

function normalizeToolResult(raw: unknown): unknown {
  if (typeof raw === "object" && raw !== null && "sources" in raw) return raw;
  if (!raw || typeof raw !== "object" || !("content" in raw) || !Array.isArray(raw.content)) throw new Error("MCP tool result has no usable content.");
  const text = raw.content.filter((item): item is { type: "text"; text: string } => typeof item === "object" && item !== null && "type" in item && item.type === "text" && "text" in item && typeof item.text === "string").map((item) => item.text).join("\n");
  const match = text.match(/```json\s*([\s\S]*?)```/) ?? ["", text];
  try { return JSON.parse(match[1]); } catch { throw new Error("MCP tool text must contain JSON shaped as { sources: [{ title, url, excerpt }] }."); }
}
