import { NextResponse } from "next/server";
import { createWorkspace, listWorkspaces } from "@/lib/research/store";
import { authenticate } from "@/lib/auth/firebase-server";

export async function GET(request: Request) { const auth = await authenticate(request); if ("response" in auth) return auth.response; return NextResponse.json(await listWorkspaces(auth.user.uid)); }
export async function POST(request: Request) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  if (typeof body.name !== "string" || !body.name.trim()) return NextResponse.json({ error: "A workspace name is required." }, { status: 400 });
  return NextResponse.json(await createWorkspace(auth.user.uid, body.name.trim(), typeof body.description === "string" ? body.description.trim() : ""), { status: 201 });
}
