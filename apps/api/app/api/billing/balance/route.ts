import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/firebase-server";
import { creditBalance } from "@/lib/billing/credits";

export async function GET(request: Request) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  return NextResponse.json(await creditBalance(auth.user.uid));
}
