import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import pg from "pg";

const [email, creditText] = process.argv.slice(2);
const credits = Number(creditText);

if (!email || !Number.isInteger(credits) || credits <= 0) {
  throw new Error("Usage: node scripts/grant-admin-credits.mjs email@example.com 1000");
}

const repositoryRoot = existsSync(join(process.cwd(), ".env")) ? process.cwd() : resolve(process.cwd(), "../..");
nextEnv.loadEnvConfig(repositoryRoot);
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? await readFile(resolve(repositoryRoot, process.env.FIREBASE_SERVICE_ACCOUNT_PATH), "utf8") : undefined);
if (!serviceAccountRaw || !process.env.DATABASE_URL) {
  throw new Error("Firebase Admin credentials and DATABASE_URL are required.");
}

const serviceAccount = JSON.parse(serviceAccountRaw);
const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount) });
const user = await getAuth(app).getUserByEmail(email);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
const grantKey = `admin-grant:${email}:${credits}:2026-09-11`;

try {
  await client.query("BEGIN");
  await client.query("INSERT INTO billing_accounts (owner_uid) VALUES ($1) ON CONFLICT (owner_uid) DO NOTHING", [user.uid]);
  const result = await client.query("INSERT INTO credit_ledger (id, account_id, kind, credits, idempotency_key, metadata) VALUES ($1,$2,'grant',$3,$4,$5::jsonb) ON CONFLICT (idempotency_key) DO NOTHING RETURNING id", [randomUUID(), user.uid, credits, grantKey, JSON.stringify({ source: "admin_grant", grantedBy: email, reason: "Initial administrator credit balance" })]);
  const balance = await client.query("SELECT COALESCE(SUM(credits),0)::text AS credits FROM credit_ledger WHERE account_id = $1", [user.uid]);
  await client.query("COMMIT");
  console.log(result.rowCount ? `Granted ${credits} credits to ${email}.` : `The ${credits}-credit grant for ${email} already exists.`);
  console.log(`Current ledger balance: ${balance.rows[0].credits} credits.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
