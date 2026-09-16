import { runResearch } from "@/lib/research/engine";
import { saveSession } from "@/lib/research/store";
import { authenticate } from "@/lib/auth/firebase-server";
import { quoteResearch } from "@/lib/billing/quote";
import { reserveCredits, settleReservation } from "@/lib/billing/credits";

export const runtime = "nodejs";

const encoder = new TextEncoder();
const message = (event: string, payload: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);

export async function POST(request: Request) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question : undefined;
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : undefined;
  const depth = body.depth === "extended" ? "extended" : "standard";
  const sourceTarget = Math.max(2, Math.min(10, typeof body.sourceTarget === "number" ? Math.floor(body.sourceTarget) : 5));
  const billingReference = crypto.randomUUID();
  const quote = quoteResearch(depth === "extended" ? Math.max(8, sourceTarget) : sourceTarget);
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  void (async () => {
    let pendingWrites = Promise.resolve();
    try {
      await reserveCredits(auth.user.uid, quote.credits, { type: "research", id: billingReference });
      await writer.write(message("trace", { id: crypto.randomUUID(), at: new Date().toISOString(), kind: "plan", message: `Reserved ${quote.credits} credits for this research run.`, status: "complete" }));
      const session = await runResearch(question, { depth, sourceTarget, onTrace: (trace) => { pendingWrites = pendingWrites.then(() => writer.write(message("trace", trace))); } });
      const persisted = await saveSession(session, auth.user.uid, workspaceId);
      if (!persisted.persisted) session.trace.push({ id: crypto.randomUUID(), at: new Date().toISOString(), kind: "recovery", message: "Session persistence unavailable.", detail: persisted.reason, status: "warning" });
      await pendingWrites;
      await settleReservation(auth.user.uid, { type: "research", id: billingReference }, quote.credits);
      await writer.write(message("complete", session));
    } catch (error) {
      await settleReservation(auth.user.uid, { type: "research", id: billingReference }, 0).catch(() => undefined);
      await writer.write(message("error", { detail: error instanceof Error ? error.message : "Unknown server error" }));
    } finally { await writer.close(); }
  })();
  return new Response(stream.readable, { headers: { "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "Content-Type": "text/event-stream" } });
}
