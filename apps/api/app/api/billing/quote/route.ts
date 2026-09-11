import { NextResponse } from "next/server";
import { quotePaper, quoteResearch } from "@/lib/billing/quote";
import { authenticate } from "@/lib/auth/firebase-server";

export async function POST(request: Request) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(body.kind === "research" ? quoteResearch(typeof body.webSearchAllowance === "number" ? body.webSearchAllowance : 5) : quotePaper(typeof body.wordCount === "number" ? body.wordCount : 1000));
}
