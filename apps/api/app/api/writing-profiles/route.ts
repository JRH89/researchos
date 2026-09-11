import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/firebase-server";
import { createWritingProfile, listWritingProfiles } from "@/lib/research/store";

export async function GET(request: Request) { const auth = await authenticate(request); if ("response" in auth) return auth.response; return NextResponse.json(await listWritingProfiles(auth.user.uid)); }
export async function POST(request: Request) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  if (typeof body.name !== "string" || !body.name.trim()) return NextResponse.json({ error: "A profile name is required." }, { status: 400 });
  return NextResponse.json(await createWritingProfile(auth.user.uid, body), { status: 201 });
}
