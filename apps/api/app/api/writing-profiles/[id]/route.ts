import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/firebase-server";
import { deleteWritingProfile } from "@/lib/research/store";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const deleted = await deleteWritingProfile((await params).id, auth.user.uid);
  return deleted ? new Response(null, { status: 204 }) : NextResponse.json({ error: "Writing profile not found." }, { status: 404 });
}
