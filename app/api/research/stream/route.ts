import { runResearch } from "@/lib/research/engine";
import { saveSession } from "@/lib/research/store";
import { authenticate } from "@/lib/auth/firebase-server";

export const runtime = "nodejs";

const encoder = new TextEncoder();
const message = (event: string, payload: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);

export async function POST(request: Request) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question : undefined;
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : undefined;
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  void (async () => {
    let pendingWrites = Promise.resolve();
    try {
      const session = await runResearch(question, { onTrace: (trace) => { pendingWrites = pendingWrites.then(() => writer.write(message("trace", trace))); } });
      const persisted = await saveSession(session, auth.user.uid, workspaceId);
      if (!persisted.persisted) session.trace.push({ id: crypto.randomUUID(), at: new Date().toISOString(), kind: "recovery", message: "Session persistence unavailable.", detail: persisted.reason, status: "warning" });
      await pendingWrites;
      await writer.write(message("complete", session));
    } catch (error) {
      await writer.write(message("error", { detail: error instanceof Error ? error.message : "Unknown server error" }));
    } finally { await writer.close(); }
  })();
  return new Response(stream.readable, { headers: { "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "Content-Type": "text/event-stream" } });
}
