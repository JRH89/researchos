import { NextResponse } from "next/server";
import { runResearch } from "@/lib/research/engine";
import { saveSession } from "@/lib/research/store";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const question = typeof body.question === "string" ? body.question : undefined;
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : undefined;
    const session = await runResearch(question);
    const persisted = await saveSession(session, workspaceId);
    if (!persisted.persisted) session.trace.push({ id: crypto.randomUUID(), at: new Date().toISOString(), kind: "recovery", message: "Session persistence unavailable.", detail: persisted.reason, status: "warning" });
    return NextResponse.json(session);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: "Research run failed.", detail }, { status: 500 });
  }
}
