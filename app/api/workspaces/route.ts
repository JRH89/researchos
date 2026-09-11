import { NextResponse } from "next/server";
import { createWorkspace, listWorkspaces } from "@/lib/research/store";

export async function GET() { return NextResponse.json(await listWorkspaces()); }
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.name !== "string" || !body.name.trim()) return NextResponse.json({ error: "A workspace name is required." }, { status: 400 });
  return NextResponse.json(await createWorkspace(body.name.trim(), typeof body.description === "string" ? body.description.trim() : ""), { status: 201 });
}
