import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/firebase-server";
import { billingAccount } from "@/lib/billing/credits";
import { stripeClient } from "@/lib/billing/stripe";
import { runtimeEnv } from "@/lib/runtime-env";

export async function POST(request: Request) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const account = await billingAccount(auth.user.uid); if (!account.stripe_customer_id) return NextResponse.json({ error: "No billing account exists yet." }, { status: 404 });
  const origin = runtimeEnv("SITE_URL") || new URL(request.url).origin; const portal = await stripeClient().billingPortal.sessions.create({ customer: account.stripe_customer_id, return_url: `${origin}/` });
  return NextResponse.json({ url: portal.url });
}
