import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/firebase-server";
import { billingAccount, updateBillingAccount } from "@/lib/billing/credits";
import { configuredPrice, isCreditPack, isSubscriptionPlan, stripeClient } from "@/lib/billing/stripe";
import { runtimeEnv } from "@/lib/runtime-env";

export async function POST(request: Request) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({})); const product = typeof body.product === "string" ? body.product : "";
  if (!isCreditPack(product) && !isSubscriptionPlan(product)) return NextResponse.json({ error: "Choose a valid credit pack or subscription plan." }, { status: 400 });
  const stripe = stripeClient(); const account = await billingAccount(auth.user.uid);
  let customerId = account.stripe_customer_id as string | null;
  if (!customerId) { const customer = await stripe.customers.create({ email: auth.user.email || undefined, name: auth.user.name || undefined, metadata: { researchos_owner_uid: auth.user.uid } }); customerId = customer.id; await updateBillingAccount(auth.user.uid, { stripeCustomerId: customerId }); }
  const origin = runtimeEnv("SITE_URL") || new URL(request.url).origin;
  const isPack = isCreditPack(product); const session = await stripe.checkout.sessions.create({ mode: isPack ? "payment" : "subscription", customer: customerId, line_items: [{ price: configuredPrice(product), quantity: 1 }], allow_promotion_codes: true, success_url: `${origin}/?checkout=success`, cancel_url: `${origin}/?checkout=cancelled`, metadata: { researchos_owner_uid: auth.user.uid, product, fulfillment: isPack ? "credit_pack" : "subscription" }, ...(isPack ? {} : { subscription_data: { metadata: { researchos_owner_uid: auth.user.uid, product } } }) });
  return NextResponse.json({ url: session.url });
}
