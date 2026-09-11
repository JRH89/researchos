import Anthropic from "@anthropic-ai/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is required for the Claude web-search MCP server.");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const server = new McpServer({ name: "researchos-claude-web-search", version: "0.1.0" });
const webSearchTool = { type: "web_search_20250305", name: "web_search", max_uses: 3 };

async function search(query) {
  const prompt = `Search the public web for authoritative technical sources that answer this research question: ${query}\nUse web search. In your final response, make only source-supported statements and attach citations.`;
  let messages = [{ role: "user", content: prompt }];
  let response = await anthropic.messages.create({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929", max_tokens: 1500, messages, tools: [webSearchTool] });
  for (let attempt = 0; response.stop_reason === "pause_turn" && attempt < 2; attempt += 1) {
    messages = [...messages, { role: "assistant", content: response.content }];
    response = await anthropic.messages.create({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929", max_tokens: 1500, messages, tools: [webSearchTool] });
  }
  const sources = [];
  for (const block of response.content) {
    if (block.type !== "text" || !Array.isArray(block.citations)) continue;
    for (const citation of block.citations) {
      if (citation.type !== "web_search_result_location") continue;
      sources.push({ title: citation.title, url: citation.url, excerpt: citation.cited_text });
    }
  }
  const unique = sources.filter((source, index) => sources.findIndex((item) => item.url === source.url && item.excerpt === source.excerpt) === index);
  if (!unique.length) throw new Error("Claude web search returned no citable sources.");
  return unique;
}

server.tool("search_web_with_claude", "Search the live public web through Claude's server-side web search. Returns cited source excerpts. This is read-only and can incur provider search charges.", { query: z.string().min(1).max(500).describe("Technical research query") }, { readOnlyHint: true }, async ({ query }) => ({ content: [{ type: "text", text: JSON.stringify({ sources: await search(query) }) }] }));

await server.connect(new StdioServerTransport());
