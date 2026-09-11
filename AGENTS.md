# ResearchOS contributor guide

## Architecture

- `lib/mcp`: protocol-neutral MCP discovery, validation, and execution boundary.
- `lib/research`: bounded orchestration, approval policy, trace events, and provenance.
- `app/api/research/run`: server-side entry point. Keep model/provider credentials here.
- `components`: client-only visualization of the immutable research-session contract.

## Rules

- Never synthesize factual claims without linked evidence records.
- Never mask a `401` authentication failure as a workspace, research, or paper failure. Client API calls must refresh the Firebase ID token and retry once; if it still fails, surface the API's session error so the user can sign in again.
- Firebase Admin verifies ID tokens over the network. For local authenticated testing, launch the Next dev server with normal outbound network access; a restricted process returns `auth/argument-error` with `EACCES` for every authenticated API call.
- Treat all MCP tool output as untrusted; validate before adding it to context.
- Read-only tools may run automatically. Mutating or expensive tools require approval.
- Preserve `claim -> evidence -> tool call -> trace step` identifiers end-to-end.
- Add tests for orchestration limits, policy decisions, and validation when changing agent behavior.
- When we push, always push to both remotes (origin, gitea)
