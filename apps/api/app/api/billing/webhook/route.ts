import Stripe from "stripe";
import { grantCredits, ownerForStripeCustomer, recordWebhookEvent, updateBillingAccount, webhookEventProcessed } from "@/lib/billing/credits";
import { creditPacks, stripeClient, subscriptionPlans } from "@/lib/billing/stripe";
import { runtimeEnv } from "@/lib/runtime-env";

export const runtime = "nodejs";

function string(value: unknown) { return typeof value === "string" ? value : undefined; }
function subscriptionPlanFromPrice(priceId: string | undefined) { return Object.entries(subscriptionPlans).find(([, plan]) => runtimeEnv(plan.priceEnv) === priceId)?.[0]; }
function planCredits(plan: string | undefined) { return plan && plan in subscriptionPlans ? subscriptionPlans[plan as keyof typeof subscriptionPlans].credits : 0; }

async function handleCheckout(session: Stripe.Checkout.Session, eventId: string) {
  const ownerUid = string(session.metadata?.researchos_owner_uid); const product = string(session.metadata?.product); const customerId = string(session.customer);
  if (!ownerUid || !product || !customerId) throw new Error("Stripe Checkout session is missing ResearchOS fulfillment metadata.");
  await updateBillingAccount(ownerUid, { stripeCustomerId: customerId });
  if (product in creditPacks && session.payment_status === "paid") await grantCredits(ownerUid, creditPacks[product as keyof typeof creditPacks].credits, `stripe:checkout:${eventId}`, { source: "stripe_checkout", product, checkoutSessionId: session.id });
}

async function handleInvoice(invoice: Stripe.Invoice, eventId: string) {
  const customerId = string(invoice.customer); if (!customerId) return;
  const ownerUid = await ownerForStripeCustomer(customerId); if (!ownerUid) return;
  const line = invoice.lines.data[0] as unknown as { price?: { id?: string }; pricing?: { price_details?: { price?: string } } } | undefined;
  const priceId = line?.price?.id || line?.pricing?.price_details?.price; const plan = subscriptionPlanFromPrice(priceId); const credits = planCredits(plan);
  if (!plan || !credits) return;
  await updateBillingAccount(ownerUid, { subscriptionStatus: "active", subscriptionPlan: plan });
  await grantCredits(ownerUid, credits, `stripe:invoice:${invoice.id}`, { source: "stripe_subscription", plan, invoiceId: invoice.id, eventId });
}

async function handleSubscription(subscription: Stripe.Subscription) {
  const customerId = string(subscription.customer); if (!customerId) return;
  const ownerUid = await ownerForStripeCustomer(customerId); if (!ownerUid) return;
  const priceId = subscription.items.data[0]?.price.id; const plan = subscriptionPlanFromPrice(priceId);
  const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
  await updateBillingAccount(ownerUid, { subscriptionStatus: subscription.status, subscriptionPlan: plan || null, stripeSubscriptionId: subscription.id, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature"); const secret = runtimeEnv("STRIPE_WEBHOOK_SECRET");
  if (!signature || !secret) return new Response("Webhook signature is required.", { status: 400 });
  let event: Stripe.Event;
  try { event = stripeClient().webhooks.constructEvent(await request.text(), signature, secret); } catch { return new Response("Invalid webhook signature.", { status: 400 }); }
  if (await webhookEventProcessed(event.id)) return new Response("ok", { status: 200 });
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") await handleCheckout(event.data.object as Stripe.Checkout.Session, event.id);
    if (event.type === "invoice.paid") await handleInvoice(event.data.object as Stripe.Invoice, event.id);
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") await handleSubscription(event.data.object as Stripe.Subscription);
    if (event.type === "invoice.payment_failed") { const invoice = event.data.object as Stripe.Invoice; const customerId = string(invoice.customer); if (customerId) { const ownerUid = await ownerForStripeCustomer(customerId); if (ownerUid) await updateBillingAccount(ownerUid, { subscriptionStatus: "past_due" }); } }
    await recordWebhookEvent(event.id, event.type, { objectId: (event.data.object as { id?: string }).id || "unknown" });
    return new Response("ok", { status: 200 });
  } catch (error) { console.error("Stripe webhook processing failed", { eventId: event.id, type: event.type, message: error instanceof Error ? error.message : "Unknown error" }); return new Response("Webhook processing failed.", { status: 500 }); }
}
