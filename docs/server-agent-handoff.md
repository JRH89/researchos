# ResearchOS home-server handoff

This document is for the agent operating the home server. Its job is to deploy only the ResearchOS API, PostgreSQL, stdio MCP servers, and Cloudflare Tunnel. The frontend is a separate static Cloudflare Pages deployment.

## Architecture and boundaries

| Component | Runs on | Public address | Secret boundary |
| --- | --- | --- | --- |
| `apps/web` | Cloudflare Pages | `https://research-os.org` | Browser-safe `NEXT_PUBLIC_*` values only |
| `apps/api` | Home server Docker Compose | `https://api.research-os.org` via Tunnel | All secrets remain here |
| PostgreSQL | Home server Docker volume | Never public | API-only |
| MCP stdio servers | API container child processes | Never public | API-only |

Never expose PostgreSQL port 5432, API port 3001, MCP stdio servers, Firebase Admin credentials, model keys, Stripe keys, or the Cloudflare Tunnel token to Pages or Git.

## Prerequisites

1. Docker Engine and Docker Compose are installed and working on the home server.
2. The server can clone either configured Git remote.
3. The `research-os.org` zone is active in the same Cloudflare account that will own the Pages project and Tunnel.
4. Firebase Authentication is already configured for the project, with `research-os.org` added as an authorized domain before public sign-in testing.
5. Stripe is optional until billing is configured. Leave Stripe variables blank until its products and webhook endpoint are ready.

## 1. Obtain the repository

Clone the repository into a dedicated directory owned by the deployment user. Work on the intended production branch. Do not place the checkout inside a public web root.

The repository root contains:

- `compose.production.yaml` - production API, migration, PostgreSQL, and Tunnel services.
- `.env.example` - the single configuration template.
- `apps/api` - server-only application, MCP servers, and migrations.
- `apps/web` - static Pages application; do not run it on the server.

## 2. Create the production `.env`

Copy `.env.example` to a root `.env`. It is ignored by Git. Use these production values, replacing every placeholder with an actual secret or identifier:

```dotenv
SITE_URL=https://research-os.org
FRONTEND_ORIGIN=https://research-os.org
NEXT_PUBLIC_SITE_URL=https://research-os.org
NEXT_PUBLIC_API_BASE_URL=https://api.research-os.org

RESEARCHOS_DB_NAME=researchos
RESEARCHOS_DB_PASSWORD=<long-unique-postgres-password>

DATABASE_URL=postgresql://researchos:<same-password>@postgres:5432/researchos

MCP_SERVERS_JSON=[{"name":"claude-web-search","command":"node","args":["mcp/claude-web-search-server.mjs"]},{"name":"local-research-corpus","command":"node","args":["mcp/local-research-server.mjs"]}]
RESEARCHOS_DEMO_MODE=false

ANTHROPIC_API_KEY=<real-anthropic-key>
ANTHROPIC_MODEL=claude-haiku-4-5-20251001

FIREBASE_SERVICE_ACCOUNT_JSON=<one-line-entire-service-account-json>
FIREBASE_SERVICE_ACCOUNT_PATH=
RESEARCHOS_AUTH_MODE=required

CLOUDFLARE_TUNNEL_TOKEN=<token-created-in-the-cloudflare-dashboard>
```

Also add the four Firebase web configuration variables and, when ready, Stripe configuration variables from `.env.example`. The API container uses `FIREBASE_SERVICE_ACCOUNT_JSON`; do **not** use a local JSON file path in the container.

Do not quote the whole `MCP_SERVERS_JSON` value unless the shell or secret manager requires it. It must remain valid JSON. The API resolves the `mcp/...` script paths inside `apps/api` automatically.

## 3. Create the Cloudflare Tunnel before starting Compose

In the Cloudflare dashboard:

1. Go to **Networks > Tunnels**, create a remotely managed Tunnel named `researchos-api`.
2. Add a published application:
   - Hostname: `api.research-os.org`
   - Service type: `HTTP`
   - URL: `http://api:3001`
3. Copy the Tunnel token into `CLOUDFLARE_TUNNEL_TOKEN` in the root `.env`.

The hostname points to `api:3001`, not `localhost:3001`, because `cloudflared` and `api` communicate on the Compose network. The API is bound to the home server loopback interface only; Tunnel is the sole public ingress.

## 4. Deploy

From the repository root:

```bash
docker compose -f compose.production.yaml up -d --build
```

Compose starts services in this order:

1. PostgreSQL with its persistent `researchos_postgres` volume.
2. One-shot `migrate` service, which applies `apps/api/db/migrations`.
3. API service after migrations complete successfully.
4. Cloudflared Tunnel service.

Do not use `docker compose down -v`; that removes the database volume. Normal application updates use the same `up -d --build` command and retain the volume.

## 5. Verify before enabling the frontend

Run these checks on the server:

```bash
docker compose -f compose.production.yaml ps
curl -fsS http://127.0.0.1:3002/api/health
curl -fsS https://api.research-os.org/api/health
```

The health response must show:

- `status: "ok"`
- both MCP server names
- `modelProvider: "anthropic"`
- `persistenceConfigured: true`

Then inspect logs if anything fails:

```bash
docker compose -f compose.production.yaml logs --tail=150 migrate api cloudflared
```

Expected failure interpretation:

- Missing MCP servers: `MCP_SERVERS_JSON` is absent or invalid.
- Firebase verification failure: service-account JSON is missing, malformed, or server time is wrong.
- Database error: check `RESEARCHOS_DB_PASSWORD`, migration logs, and the Compose PostgreSQL health status.
- Cloudflare 502/1033: check Tunnel service logs and confirm the public hostname service is exactly `http://api:3001`.

## 6. Public integration test

After Pages is deployed, visit `https://research-os.org`, sign in, create a workspace, and run one small research request. Confirm:

1. Browser requests go to `https://api.research-os.org`.
2. API responses include `Access-Control-Allow-Origin: https://research-os.org`.
3. A saved workspace and run appear after refresh.
4. The run's evidence records identify the MCP server and tool call.

Only configure Stripe Checkout and the Stripe webhook after this end-to-end research flow passes. The future webhook endpoint is `https://api.research-os.org/api/billing/webhook`.

## Ongoing updates

For each approved release: pull the intended commit, review `.env.example` for newly required non-secret variables, run the normal Compose build command, verify health locally and through the Tunnel, then test sign-in and one research run. Never print or commit `.env` values in logs, messages, or Git.
