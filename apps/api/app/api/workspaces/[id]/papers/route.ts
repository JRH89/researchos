import { NextResponse } from "next/server";
import { listPapers } from "@/lib/research/store";
import { authenticate } from "@/lib/auth/firebase-server";
import { draftWorkspacePaper } from "@/lib/research/paper";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { const auth = await authenticate(request); if ("response" in auth) return auth.response; return NextResponse.json(await listPapers((await params).id, auth.user.uid)); }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  try { return NextResponse.json(await draftWorkspacePaper((await params).id, auth.user.uid, await request.json().catch(() => ({})),), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Paper drafting failed." }, { status: 400 }); }
}
