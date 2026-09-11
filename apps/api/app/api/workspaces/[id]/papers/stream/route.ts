import { authenticate } from "@/lib/auth/firebase-server";
import { draftWorkspacePaper } from "@/lib/research/paper";
import { quotePaper } from "@/lib/billing/quote";
import { reserveCredits, settleReservation } from "@/lib/billing/credits";

export const runtime = "nodejs";
const encoder = new TextEncoder();
const message = (event: string, payload: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({})); const workspaceId = (await params).id;
  const billingReference = crypto.randomUUID(); const quote = quotePaper(typeof body.targetWordCount === "number" ? body.targetWordCount : 1000);
  const stream = new TransformStream(); const writer = stream.writable.getWriter();
  void (async () => { try { await reserveCredits(auth.user.uid, quote.credits, { type: "paper", id: billingReference }); await writer.write(message("progress", { text: `Reserved ${quote.credits} credits for this paper.`, progress: 3 })); const paper = await draftWorkspacePaper(workspaceId, auth.user.uid, body, (text, progress) => void writer.write(message("progress", { text, progress }))); await settleReservation(auth.user.uid, { type: "paper", id: billingReference }, quote.credits); await writer.write(message("complete", paper)); } catch (error) { await settleReservation(auth.user.uid, { type: "paper", id: billingReference }, 0).catch(() => undefined); await writer.write(message("error", { detail: error instanceof Error ? error.message : "Paper drafting failed." })); } finally { await writer.close(); } })();
  return new Response(stream.readable, { headers: { "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "Content-Type": "text/event-stream" } });
}
