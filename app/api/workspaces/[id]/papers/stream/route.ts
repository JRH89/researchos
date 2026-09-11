import { authenticate } from "@/lib/auth/firebase-server";
import { draftWorkspacePaper } from "@/lib/research/paper";

export const runtime = "nodejs";
const encoder = new TextEncoder();
const message = (event: string, payload: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({})); const workspaceId = (await params).id;
  const stream = new TransformStream(); const writer = stream.writable.getWriter();
  void (async () => { try { const paper = await draftWorkspacePaper(workspaceId, auth.user.uid, body, (text, progress) => void writer.write(message("progress", { text, progress }))); await writer.write(message("complete", paper)); } catch (error) { await writer.write(message("error", { detail: error instanceof Error ? error.message : "Paper drafting failed." })); } finally { await writer.close(); } })();
  return new Response(stream.readable, { headers: { "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "Content-Type": "text/event-stream" } });
}
