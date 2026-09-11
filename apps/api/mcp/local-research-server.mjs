import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const corpus = [
  { title: "Ollama GPU support", url: "https://docs.ollama.com/gpu", excerpt: "Ollama supports GPU acceleration and documents CPU/GPU offloading when a model does not fit entirely in VRAM." },
  { title: "llama.cpp performance tips", url: "https://github.com/ggml-org/llama.cpp/blob/master/docs/development/token_generation_performance_tips.md", excerpt: "llama.cpp provides controls for GPU offload and quantized inference performance." },
  { title: "Continue's Ollama provider", url: "https://docs.continue.dev/customize/model-providers/top-level/ollama", excerpt: "Continue documents Ollama as a local model provider for chat and autocomplete configuration." }
];

const server = new McpServer({ name: "researchos-local-corpus", version: "0.1.0" });
server.tool("search_local_technical_corpus", "Search a local technical research corpus. Returns structured source evidence; this is read-only.", { query: z.string().min(1).describe("Research query") }, { readOnlyHint: true }, async ({ query }) => {
  const terms = query.toLowerCase().split(/\W+/).filter((term) => term.length > 2);
  const sources = corpus.filter((source) => terms.some((term) => `${source.title} ${source.excerpt}`.toLowerCase().includes(term)));
  return { content: [{ type: "text", text: JSON.stringify({ sources: sources.length ? sources : corpus }) }] };
});

await server.connect(new StdioServerTransport());
