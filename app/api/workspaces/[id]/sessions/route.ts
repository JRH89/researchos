import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/firebase-server";
import { listWorkspaceRuns } from "@/lib/research/store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  return NextResponse.json(await listWorkspaceRuns((await params).id, auth.user.uid));
}
