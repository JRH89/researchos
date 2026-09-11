# Production deployment

Serve the frontend through Cloudflare Pages at `https://research-os.org`. Run the API, PostgreSQL, Claude integration, Stripe integration, and all stdio MCP servers on the home server. Publish only the Node API as `https://api.research-os.org` using Cloudflare Tunnel; never expose PostgreSQL or MCP ports directly.

## Setup

1. Add `research-os.org` as the Pages custom domain in the Pages dashboard.
2. Create a Tunnel public hostname for `api.research-os.org` to `http://127.0.0.1:3000`.
3. Use the repository's single [.env.example](../.env.example) as the variable reference. Do not create or commit separate Pages or production env files.
4. Put API-only values (database, Anthropic, Stripe, MCP, Firebase Admin, and Tunnel credentials) in the home-server service environment only. Set only `SITE_URL`, `NEXT_PUBLIC_API_BASE_URL`, and `NEXT_PUBLIC_FIREBASE_*` variables in Cloudflare Pages.
5. Split browser calls from relative `/api` paths to that API base URL, then enforce CORS only for `https://research-os.org`.
6. Create a Firebase project, register `research-os.org` and its local development URL as authorized domains, then enable Google and Email/Password under Authentication > Sign-in method. Put the four `NEXT_PUBLIC_FIREBASE_*` values in Cloudflare Pages and API environment variables.
7. Create a Firebase Admin service account. Put its compact, one-line JSON in `FIREBASE_SERVICE_ACCOUNT_JSON` on the home API server only. Never add it to Cloudflare Pages.
8. Apply migrations (`npm.cmd run db:migrate`) after deploying the API update; migration `004_firebase_ownership.sql` scopes existing records to the local development owner.
9. Before launch, add API rate limits, Stripe webhook verification, PostgreSQL backups, and monitoring.

Cloudflare Tunnel works well here because the home server makes outbound connections to Cloudflare; it does not need an inbound public port.
