import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({ command: "node", args: ["mcp/local-research-server.mjs"] });
const client = new Client({ name: "researchos-mcp-smoke", version: "0.1.0" });
await client.connect(transport);
const { tools } = await client.listTools();
if (!tools.some((tool) => tool.name === "search_local_technical_corpus")) throw new Error("Expected local research tool was not discovered.");
const result = await client.callTool({ name: "search_local_technical_corpus", arguments: { query: "local LLM GPU offload" } });
if (result.isError || !Array.isArray(result.content) || result.content[0]?.type !== "text") throw new Error("Local MCP search did not return text evidence.");
const evidence = JSON.parse(result.content[0].text);
if (!Array.isArray(evidence.sources) || evidence.sources.length === 0) throw new Error("Local MCP response contains no sources.");
await transport.close();
console.log(`MCP smoke passed: discovered ${tools.length} tool(s), retrieved ${evidence.sources.length} source(s).`);
