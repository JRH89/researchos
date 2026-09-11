import { Pool, type PoolClient } from "pg";
import { runtimeEnv } from "@/lib/runtime-env";

export type CreditBalance = { availableCredits: number; reservedCredits: number; lifetimeGrantedCredits: number };
export type CreditReference = { type: "research" | "paper"; id: string };

let pool: Pool | undefined;
function database() {
  const connectionString = runtimeEnv("DATABASE_URL");
  if (!connectionString) throw new Error("DATABASE_URL is required for billing.");
  pool ??= new Pool({ connectionString });
  return pool;
}

async function account(client: PoolClient, ownerUid: string) {
  await client.query("INSERT INTO billing_accounts (owner_uid) VALUES ($1) ON CONFLICT (owner_uid) DO NOTHING", [ownerUid]);
  await client.query("INSERT INTO credit_ledger (id, account_id, kind, credits, idempotency_key, metadata) VALUES ($1,$2,'grant',10,$3,$4::jsonb) ON CONFLICT (idempotency_key) DO NOTHING", [crypto.randomUUID(), ownerUid, `welcome:${ownerUid}`, JSON.stringify({ source: "welcome", description: "One-time free ResearchOS credits" })]);
}

async function releaseExpired(client: PoolClient, ownerUid: string) {
  const expired = await client.query<{ id: string; credits: number; reference_type: CreditReference["type"]; reference_id: string }>("UPDATE credit_reservations SET status = 'expired', settled_at = NOW() WHERE account_id = $1 AND status = 'reserved' AND expires_at <= NOW() RETURNING id, credits, reference_type, reference_id", [ownerUid]);
  for (const reservation of expired.rows) await client.query("INSERT INTO credit_ledger (id, account_id, kind, credits, idempotency_key, reference_type, reference_id, metadata) VALUES ($1,$2,'release',$3,$4,$5,$6,$7::jsonb) ON CONFLICT (idempotency_key) DO NOTHING", [crypto.randomUUID(), ownerUid, reservation.credits, `reservation-expired:${reservation.id}`, reservation.reference_type, reservation.reference_id, JSON.stringify({ reservationId: reservation.id, reason: "expired" })]);
}

export async function creditBalance(ownerUid: string): Promise<CreditBalance> {
  const db = database(); const client = await db.connect();
  try {
    await client.query("BEGIN"); await account(client, ownerUid); await releaseExpired(client, ownerUid);
    const ledger = await client.query<{ balance: string; grants: string }>("SELECT COALESCE(SUM(credits), 0)::text AS balance, COALESCE(SUM(CASE WHEN kind = 'grant' THEN credits ELSE 0 END), 0)::text AS grants FROM credit_ledger WHERE account_id = $1", [ownerUid]);
    const reserved = await client.query<{ credits: string }>("SELECT COALESCE(SUM(credits), 0)::text AS credits FROM credit_reservations WHERE account_id = $1 AND status = 'reserved'", [ownerUid]);
    await client.query("COMMIT");
    return { availableCredits: Number(ledger.rows[0].balance), reservedCredits: Number(reserved.rows[0].credits), lifetimeGrantedCredits: Number(ledger.rows[0].grants) };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function grantCredits(ownerUid: string, credits: number, idempotencyKey: string, metadata: Record<string, unknown> = {}) {
  if (!Number.isInteger(credits) || credits <= 0) throw new Error("Credit grants must be a positive whole number.");
  const db = database(); const client = await db.connect();
  try { await client.query("BEGIN"); await account(client, ownerUid); await client.query("INSERT INTO credit_ledger (id, account_id, kind, credits, idempotency_key, metadata) VALUES ($1,$2,'grant',$3,$4,$5::jsonb) ON CONFLICT (idempotency_key) DO NOTHING", [crypto.randomUUID(), ownerUid, credits, idempotencyKey, JSON.stringify(metadata)]); await client.query("COMMIT"); } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  return creditBalance(ownerUid);
}

export async function reserveCredits(ownerUid: string, credits: number, reference: CreditReference) {
  if (!Number.isInteger(credits) || credits <= 0) throw new Error("Reserved credits must be a positive whole number.");
  const db = database(); const client = await db.connect();
  try {
    await client.query("BEGIN"); await account(client, ownerUid); await releaseExpired(client, ownerUid);
    const existing = await client.query<{ status: string }>("SELECT status FROM credit_reservations WHERE account_id = $1 AND reference_type = $2 AND reference_id = $3 FOR UPDATE", [ownerUid, reference.type, reference.id]);
    if (existing.rowCount) { await client.query("COMMIT"); return creditBalance(ownerUid); }
    const balance = await client.query<{ credits: string }>("SELECT COALESCE(SUM(credits), 0)::text AS credits FROM credit_ledger WHERE account_id = $1", [ownerUid]);
    if (Number(balance.rows[0].credits) < credits) throw new Error("Insufficient credits for this run.");
    const reservationId = crypto.randomUUID();
    await client.query("INSERT INTO credit_reservations (id, account_id, credits, reference_type, reference_id, expires_at) VALUES ($1,$2,$3,$4,$5,NOW() + INTERVAL '30 minutes')", [reservationId, ownerUid, credits, reference.type, reference.id]);
    await client.query("INSERT INTO credit_ledger (id, account_id, kind, credits, idempotency_key, reference_type, reference_id, metadata) VALUES ($1,$2,'reservation',$3,$4,$5,$6,$7::jsonb)", [crypto.randomUUID(), ownerUid, -credits, `reservation:${reservationId}`, reference.type, reference.id, JSON.stringify({ reservationId })]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  return creditBalance(ownerUid);
}

export async function settleReservation(ownerUid: string, reference: CreditReference, actualCredits: number, providerCostUsd?: number) {
  const db = database(); const client = await db.connect();
  try {
    await client.query("BEGIN"); const found = await client.query<{ id: string; credits: number; status: string }>("SELECT id, credits, status FROM credit_reservations WHERE account_id = $1 AND reference_type = $2 AND reference_id = $3 FOR UPDATE", [ownerUid, reference.type, reference.id]);
    const reservation = found.rows[0]; if (!reservation || reservation.status !== "reserved") { await client.query("COMMIT"); return creditBalance(ownerUid); }
    const charged = Math.max(0, Math.min(reservation.credits, Math.round(actualCredits)));
    const released = reservation.credits - charged;
    await client.query("UPDATE credit_reservations SET status = 'settled', provider_cost_usd = $1, settled_at = NOW() WHERE id = $2", [providerCostUsd ?? null, reservation.id]);
    await client.query("INSERT INTO credit_ledger (id, account_id, kind, credits, idempotency_key, reference_type, reference_id, metadata) VALUES ($1,$2,'settlement',0,$3,$4,$5,$6::jsonb)", [crypto.randomUUID(), ownerUid, `settlement:${reservation.id}`, reference.type, reference.id, JSON.stringify({ reservationId: reservation.id, chargedCredits: charged, providerCostUsd })]);
    if (released) await client.query("INSERT INTO credit_ledger (id, account_id, kind, credits, idempotency_key, reference_type, reference_id, metadata) VALUES ($1,$2,'release',$3,$4,$5,$6,$7::jsonb)", [crypto.randomUUID(), ownerUid, released, `release:${reservation.id}`, reference.type, reference.id, JSON.stringify({ reservationId: reservation.id, reason: "reconciled" })]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  return creditBalance(ownerUid);
}

export async function recordWebhookEvent(eventId: string, eventType: string, payload: Record<string, unknown>) {
  const result = await database().query("INSERT INTO stripe_webhook_events (event_id, event_type, payload) VALUES ($1,$2,$3::jsonb) ON CONFLICT (event_id) DO NOTHING RETURNING event_id", [eventId, eventType, JSON.stringify(payload)]);
  return Boolean(result.rowCount);
}

export async function webhookEventProcessed(eventId: string) {
  const result = await database().query("SELECT 1 FROM stripe_webhook_events WHERE event_id = $1", [eventId]);
  return Boolean(result.rowCount);
}

export async function billingAccount(ownerUid: string) {
  const db = database(); const client = await db.connect();
  try { await client.query("BEGIN"); await account(client, ownerUid); const result = await client.query("SELECT owner_uid, stripe_customer_id, subscription_status, subscription_plan, stripe_subscription_id, current_period_end FROM billing_accounts WHERE owner_uid = $1", [ownerUid]); await client.query("COMMIT"); return result.rows[0]; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function updateBillingAccount(ownerUid: string, changes: { stripeCustomerId?: string | null; subscriptionStatus?: string; subscriptionPlan?: string | null; stripeSubscriptionId?: string | null; currentPeriodEnd?: Date | null }) {
  const db = database(); const client = await db.connect();
  try { await client.query("BEGIN"); await account(client, ownerUid); await client.query("UPDATE billing_accounts SET stripe_customer_id = COALESCE($2, stripe_customer_id), subscription_status = COALESCE($3, subscription_status), subscription_plan = $4, stripe_subscription_id = $5, current_period_end = $6, updated_at = NOW() WHERE owner_uid = $1", [ownerUid, changes.stripeCustomerId ?? null, changes.subscriptionStatus ?? null, changes.subscriptionPlan ?? null, changes.stripeSubscriptionId ?? null, changes.currentPeriodEnd ?? null]); await client.query("COMMIT"); } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function ownerForStripeCustomer(customerId: string) {
  const result = await database().query<{ owner_uid: string }>("SELECT owner_uid FROM billing_accounts WHERE stripe_customer_id = $1", [customerId]);
  return result.rows[0]?.owner_uid;
}
