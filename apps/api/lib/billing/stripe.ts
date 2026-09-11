import Stripe from "stripe";
import { runtimeEnv } from "@/lib/runtime-env";

export const creditPacks = {
  starter: { credits: 60, priceEnv: "STRIPE_PRICE_PACK_STARTER" },
  standard: { credits: 165, priceEnv: "STRIPE_PRICE_PACK_STANDARD" },
  semester: { credits: 400, priceEnv: "STRIPE_PRICE_PACK_SEMESTER" },
} as const;

export const subscriptionPlans = {
  study: { credits: 120, priceEnv: "STRIPE_PRICE_SUBSCRIPTION_STUDY" },
  scholar: { credits: 280, priceEnv: "STRIPE_PRICE_SUBSCRIPTION_SCHOLAR" },
  researcher: { credits: 650, priceEnv: "STRIPE_PRICE_SUBSCRIPTION_RESEARCHER" },
} as const;

export type CheckoutProduct = keyof typeof creditPacks | keyof typeof subscriptionPlans;
export function isCreditPack(value: string): value is keyof typeof creditPacks { return value in creditPacks; }
export function isSubscriptionPlan(value: string): value is keyof typeof subscriptionPlans { return value in subscriptionPlans; }
export function stripeClient() {
  const key = runtimeEnv("STRIPE_SECRET_KEY");
  if (!key) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY on the API server.");
  return new Stripe(key);
}
export function configuredPrice(product: CheckoutProduct) {
  const config = isCreditPack(product) ? creditPacks[product] : subscriptionPlans[product];
  const price = runtimeEnv(config.priceEnv);
  if (!price) throw new Error(`Stripe product is not configured. Set ${config.priceEnv}.`);
  return price;
}
