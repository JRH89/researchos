# ResearchOS production deployment

ResearchOS runs as two applications from one repository:

- `apps/web`: static Next export deployed to Cloudflare Pages at `https://research-os.org`.
- `apps/api`: Node Next API runtime, PostgreSQL, and stdio MCP servers running on the home server. Cloudflare Tunnel publishes it at `https://api.research-os.org`.

For the complete operational checklist to give the home-server agent, use [server-agent-handoff.md](server-agent-handoff.md).

## Cloudflare Pages

Connect the repository to a Pages project. Use `npm run build:web` as the build command and `apps/web/out` as the output directory.

Set only these production variables in Pages:

- `NEXT_PUBLIC_API_BASE_URL=https://api.research-os.org`
- `NEXT_PUBLIC_SITE_URL=https://research-os.org`
- The four `NEXT_PUBLIC_FIREBASE_*` variables.

Never add database, model-provider, Firebase Admin, Stripe, MCP, or Cloudflare Tunnel credentials to Pages.

## Home server API

Use the single root `.env` file from `.env.example`. For Compose production, retain `RESEARCHOS_DB_NAME` and `RESEARCHOS_DB_PASSWORD`; Compose constructs the internal `DATABASE_URL` using the `postgres` service hostname.

Set `SITE_URL=https://research-os.org`, `FRONTEND_ORIGIN=https://research-os.org`, and `NEXT_PUBLIC_API_BASE_URL=https://api.research-os.org`. Set `FIREBASE_SERVICE_ACCOUNT_JSON` rather than a file path in the container. Add model, MCP, and Stripe secrets only on this server.

Create a Cloudflare Tunnel published application for `api.research-os.org` whose service URL is `http://api:3001`. Put its token in `CLOUDFLARE_TUNNEL_TOKEN` in the same root `.env`. The Compose stack keeps the API bound to loopback; the tunnel is the only public ingress.

Deploy the production stack with `compose.production.yaml`. Verify `https://api.research-os.org/api/health` before pointing Pages at it.

## Firebase and Stripe

Add `research-os.org` to Firebase Authentication's authorized domains. Configure Stripe only after `/api/health`, Firebase sign-in, workspace persistence, and a real research run work through the public API.

Stripe webhooks target `https://api.research-os.org/api/billing/webhook` and require `STRIPE_WEBHOOK_SECRET` on the API server.
