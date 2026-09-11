# Production deployment

Serve the frontend through Cloudflare Pages at `https://research-os.org`. Run the API, PostgreSQL, Claude integration, Stripe integration, and all stdio MCP servers on the home server. Publish only the Node API as `https://api.research-os.org` using Cloudflare Tunnel; never expose PostgreSQL or MCP ports directly.

## Setup

1. Add `research-os.org` as the Pages custom domain in the Pages dashboard.
2. Create a Tunnel public hostname for `api.research-os.org` to `http://127.0.0.1:3000`.
3. Put database, Anthropic, Stripe, MCP, and Tunnel credentials in the home-server environment only.
4. Set `NEXT_PUBLIC_API_BASE_URL=https://api.research-os.org` in Pages build settings.
5. Split browser calls from relative `/api` paths to that API base URL, then enforce CORS only for `https://research-os.org`.
6. Before launch, add authentication, API rate limits, Stripe webhook verification, PostgreSQL backups, and monitoring.

Cloudflare Tunnel works well here because the home server makes outbound connections to Cloudflare; it does not need an inbound public port.
