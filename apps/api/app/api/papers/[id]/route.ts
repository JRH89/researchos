import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/firebase-server";
import { deletePaper } from "@/lib/research/store";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const deleted = await deletePaper((await params).id, auth.user.uid);
  return deleted ? new Response(null, { status: 204 }) : NextResponse.json({ error: "Paper not found." }, { status: 404 });
}
