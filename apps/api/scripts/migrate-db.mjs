import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(existsSync(join(process.cwd(), ".env")) ? process.cwd() : join(process.cwd(), "../.."));
const connectionString = process.env.DATABASE_URL || "postgresql://researchos:researchos_local_only@localhost:5433/researchos_test";
const pool = new pg.Pool({ connectionString });
for (const file of (await readdir("db/migrations")).filter((name) => name.endsWith(".sql")).sort()) await pool.query(await readFile(join("db/migrations", file), "utf8"));
await pool.end();
console.log("Database migrations applied.");
