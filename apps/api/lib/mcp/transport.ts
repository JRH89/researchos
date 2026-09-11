import type { ToolDefinition } from "@/lib/research/contracts";

export type MCPTransport = {
  serverName: string;
  listTools(): Promise<ToolDefinition[]>;
  callTool(name: string, input: Record<string, unknown>): Promise<unknown>;
  close?(): Promise<void>;
};
