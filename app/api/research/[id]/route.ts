import { NextResponse } from "next/server";
import { getSession } from "@/lib/research/store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession((await params).id);
  return session ? NextResponse.json(session) : NextResponse.json({ error: "Session not found or persistence is not configured." }, { status: 404 });
}
