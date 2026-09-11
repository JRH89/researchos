import { NextResponse } from "next/server";
import { getSession } from "@/lib/research/store";
import { authenticate } from "@/lib/auth/firebase-server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const session = await getSession((await params).id, auth.user.uid);
  return session ? NextResponse.json(session) : NextResponse.json({ error: "Session not found or persistence is not configured." }, { status: 404 });
}
