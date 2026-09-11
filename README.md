# ResearchOS

ResearchOS is an evidence-backed research workspace. It plans research, dynamically discovers MCP tools, validates returned evidence, and preserves the path from a report claim to its source, tool call, and execution trace.

## Monorepo architecture

| Package | Responsibility | Deployment |
| --- | --- | --- |
| `apps/web` | Static Next.js frontend, Firebase client authentication, research and paper UX | Cloudflare Pages at `research-os.org` |
| `apps/api` | Node API, Firebase Admin verification, PostgreSQL persistence, billing, research orchestration, and MCP client | Home server at `api.research-os.org` through Cloudflare Tunnel |

The API is the only service that receives database, model, Stripe, Firebase Admin, MCP, and tunnel secrets. Pages receives only browser-safe `NEXT_PUBLIC_*` values.

## What it does

- Connects to real stdio MCP servers, discovers their tools at runtime, and only auto-runs read-only tools.
- Uses bounded planning, tool-call, time, and iteration budgets.
- Treats tool output as untrusted and validates it before it reaches model context.
- Stores workspaces, saved runs, cited papers, writing profiles, and short-lived unfiled sessions in PostgreSQL.
- Streams research and paper-writing progress to the interface.
- Supports APA and MLA essays or research papers, source limits, DOCX/PDF/Markdown exports, and evidence provenance.
- Uses Firebase Authentication and reserves internal credits before paid research or paper runs.

## Development

Use the single root `.env` file, based on `.env.example`. Start PostgreSQL with `docker compose up -d`, apply migrations with `npm run db:migrate`, then run the two processes separately:

```
npm run dev:api
npm run dev:web
```

The frontend is served at `http://localhost:3000` and automatically calls `http://localhost:3001` during local development, even when the root environment is configured for production URLs.

Run `npm run build` to produce both deployable applications. The static Pages artifact is `apps/web/out`.

## Production

The intended production deployment is documented in [docs/deployment.md](docs/deployment.md). `compose.production.yaml` runs PostgreSQL, migrations, the API/MCP host, and Cloudflare Tunnel on the home server. Cloudflare Pages builds only `apps/web`.

## Safety model

ResearchOS never turns unlinked text into a factual report claim. Every reported claim retains evidence records, which retain their MCP server, tool-call, and trace-step IDs. Paid or mutating tools remain approval-gated.
