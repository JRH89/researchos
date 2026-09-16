import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/firebase-server";
import { deletePaper, updatePaper } from "@/lib/research/store";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const deleted = await deletePaper((await params).id, auth.user.uid);
  return deleted ? new Response(null, { status: 204 }) : NextResponse.json({ error: "Paper not found." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  if (typeof body.contentMarkdown !== "string") return NextResponse.json({ error: "Paper content is required." }, { status: 400 });
  try {
    const paper = await updatePaper((await params).id, auth.user.uid, { title: typeof body.title === "string" ? body.title : undefined, contentMarkdown: body.contentMarkdown });
    return paper ? NextResponse.json(paper) : NextResponse.json({ error: "Paper not found." }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save paper changes." }, { status: 400 }); }
}
