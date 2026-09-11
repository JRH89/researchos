import pg from "pg";
import nextEnv from "@next/env";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(existsSync(resolve(process.cwd(), ".env")) ? process.cwd() : resolve(process.cwd(), "../.."));
const connectionString = process.env.DATABASE_URL || "postgresql://researchos:researchos_local_only@localhost:5433/researchos_test";
const pool = new pg.Pool({ connectionString });
const result = await pool.query("SELECT to_regclass('public.research_sessions') AS table_name");
await pool.end();
if (result.rows[0]?.table_name !== "research_sessions") throw new Error("research_sessions migration has not been applied.");
console.log("PostgreSQL smoke passed: research_sessions table is ready.");
