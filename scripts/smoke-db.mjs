import pg from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://researchos:researchos_local_only@localhost:5433/researchos_test";
const pool = new pg.Pool({ connectionString });
const result = await pool.query("SELECT to_regclass('public.research_sessions') AS table_name");
await pool.end();
if (result.rows[0]?.table_name !== "research_sessions") throw new Error("research_sessions migration has not been applied.");
console.log("PostgreSQL smoke passed: research_sessions table is ready.");
