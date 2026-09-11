# ResearchOS

An MCP-powered technical research agent with a visible execution trace and statement-level provenance.

## What is implemented

- Real stdio MCP discovery through the official MCP client: ResearchOS spawns configured servers, lists their tools, calls selected tools, and closes each transport after the run.
- Bounded plan → execute → evaluate → synthesize loop with time, iteration, and tool-call budgets.
- Read-only auto-execution and approval gates for mutating/costly tools.
- Validated tool results, recoverable tool errors, structured trace events, and evidence-backed claims.
- A Next.js trace UI where every claim opens its source excerpt and originating MCP call.
- Claude Messages API and OpenAI Responses-compatible adapters for live planning, tool selection, and structured synthesis. Claude is selected when `ANTHROPIC_API_KEY` is set.
- PostgreSQL-backed durable session persistence when `DATABASE_URL` is configured.
- An explicit local deterministic fallback, enabled only with `RESEARCHOS_DEMO_MODE=true`.

## Run

```powershell
npm.cmd install
npm.cmd run dev
```

Copy `.env.example` to `.env.local`, configure an MCP server and `OPENAI_API_KEY`, apply `db/migrations/001_research_sessions.sql`, then open `http://localhost:3000`. Tests: `npm.cmd test`.

## Local test stack

This repo includes a real local PostgreSQL database and stdio MCP server. Start the database, then copy `.env.local.example` to `.env.local`:

```powershell
docker compose up -d
Copy-Item .env.local.example .env.local
npm.cmd run test:db
npm.cmd run test:mcp
npm.cmd run dev
```

The MCP server in `mcp/local-research-server.mjs` is a protocol-real, read-only test server with a small local corpus. It lets you validate discovery, invocation, result validation, trace capture, and persistence without external API keys.

## Live web research with Claude

`mcp/claude-web-search-server.mjs` exposes Claude's server-side web search as a separate, read-only MCP tool. Add it to `MCP_SERVERS_JSON` as shown in `.env.local.example`; it inherits `ANTHROPIC_API_KEY` from the application environment and turns returned web citations into ResearchOS evidence records. Each tool run permits up to three web searches, so keep this server behind the existing session budget. Anthropic charges web-search requests separately from model tokens; see its current pricing before using it at scale.

## Connecting real MCP servers

Set `MCP_SERVERS_JSON` to a JSON array of stdio server definitions. The client dynamically calls `listTools()` and exposes the resulting catalog to the model; no server-specific tool names are in the agent. Keep credentials inside each server's `env` object or its own secret manager.

For evidence provenance, configure research MCP tools to return a JSON text block in this shape:

```json
{ "sources": [{ "title": "Source title", "url": "https://example.com", "excerpt": "Verbatim supporting passage" }] }
```

Invalid tool output is rejected and shown as a recoverable trace event. `GET /api/research/:id` retrieves a persisted session when PostgreSQL is configured.
