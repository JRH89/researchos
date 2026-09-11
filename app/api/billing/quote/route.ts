import { NextResponse } from "next/server";
import { quotePaper } from "@/lib/billing/quote";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(quotePaper(typeof body.wordCount === "number" ? body.wordCount : 1000));
}
