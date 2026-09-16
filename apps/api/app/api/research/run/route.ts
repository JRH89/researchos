import { NextResponse } from "next/server";
import { runResearch } from "@/lib/research/engine";
import { saveSession } from "@/lib/research/store";
import { authenticate } from "@/lib/auth/firebase-server";

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request); if ("response" in auth) return auth.response;
    const body = await request.json().catch(() => ({}));
    const question = typeof body.question === "string" ? body.question : undefined;
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : undefined;
    const sourceTarget = Math.max(2, Math.min(10, typeof body.sourceTarget === "number" ? Math.floor(body.sourceTarget) : 5));
    const session = await runResearch(question, { sourceTarget });
    const persisted = await saveSession(session, auth.user.uid, workspaceId);
    if (!persisted.persisted) session.trace.push({ id: crypto.randomUUID(), at: new Date().toISOString(), kind: "recovery", message: "Session persistence unavailable.", detail: persisted.reason, status: "warning" });
    return NextResponse.json(session);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: "Research run failed.", detail }, { status: 500 });
  }
}
