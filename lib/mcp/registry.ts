import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { MCPTransport } from "./transport";
import type { ToolDefinition } from "@/lib/research/contracts";

type ServerConfig = { name: string; command: string; args?: string[]; env?: Record<string, string> };
const demoSources = [
  { title: "Ollama hardware support", url: "https://docs.ollama.com/gpu", excerpt: "Ollama documents GPU acceleration and supports partial CPU/GPU offloading when a model does not entirely fit in VRAM." },
  { title: "llama.cpp GPU offload guidance", url: "https://github.com/ggml-org/llama.cpp/blob/master/docs/development/token_generation_performance_tips.md", excerpt: "llama.cpp exposes GPU layer offload and performance controls, making quantized local inference practical across varied hardware." },
  { title: "Continue local models documentation", url: "https://docs.continue.dev/customize/model-providers/top-level/ollama", excerpt: "Continue supports Ollama as a local model provider, including configuration for chat and autocomplete models." }
];

class StdioMcpTransport implements MCPTransport {
  readonly serverName: string; private client?: Client; private transport?: StdioClientTransport;
  constructor(private readonly config: ServerConfig) { this.serverName = config.name; }
  private async connect() {
    if (this.client) return this.client;
    const inheritedEnvironment = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    this.transport = new StdioClientTransport({ command: this.config.command, args: this.config.args ?? [], env: { ...inheritedEnvironment, ...this.config.env } });
    this.client = new Client({ name: "researchos", version: "0.1.0" });
    await this.client.connect(this.transport);
    return this.client;
  }
  async listTools(): Promise<ToolDefinition[]> {
    const { tools } = await (await this.connect()).listTools();
    return tools.map((tool) => ({ name: tool.name, description: tool.description || "No description supplied by MCP server.", readOnly: tool.annotations?.readOnlyHint === true, estimatedCostUsd: 0 }));
  }
  async callTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    const result = await (await this.connect()).callTool({ name, arguments: input });
    const content = Array.isArray(result.content) ? result.content : [];
    const text = content.filter((item): item is { type: "text"; text: string } => typeof item === "object" && item !== null && "type" in item && item.type === "text" && "text" in item && typeof item.text === "string").map((item) => item.text).join("\n");
    if (result.isError) throw new Error(text || "MCP tool returned an error");
    return { content };
  }
  async close() { await this.transport?.close(); this.client = undefined; this.transport = undefined; }
}

class DemoTransport implements MCPTransport {
  serverName = "local-demo-research";
  async listTools(): Promise<ToolDefinition[]> { return [{ name: "search_technical_sources", description: "Search documentation and repository sources.", readOnly: true, estimatedCostUsd: 0 }, { name: "create_external_brief", description: "Create an external document.", readOnly: false, estimatedCostUsd: 0.01 }]; }
  async callTool(name: string): Promise<unknown> { if (name !== "search_technical_sources") throw new Error(`Unknown demo tool: ${name}`); return { sources: demoSources }; }
}

function configuredServerConfigs(): ServerConfig[] {
  const raw = process.env.MCP_SERVERS_JSON;
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "object" && item !== null && "name" in item && "command" in item)) throw new Error("MCP_SERVERS_JSON must be a JSON array of { name, command, args?, env? } objects.");
  return parsed as ServerConfig[];
}

export function configuredTransports(): MCPTransport[] {
  const servers = configuredServerConfigs();
  if (servers.length) return servers.map((server) => new StdioMcpTransport(server));
  if (process.env.RESEARCHOS_DEMO_MODE === "true") return [new DemoTransport()];
  throw new Error("No MCP servers configured. Set MCP_SERVERS_JSON, or set RESEARCHOS_DEMO_MODE=true for a local walkthrough.");
}
