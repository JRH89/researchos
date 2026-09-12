import { Pool } from "pg";
import { runtimeEnv } from "@/lib/runtime-env";

export type SupportTicket = { id: string; subject: string; message: string; status: "open" | "in_progress" | "closed"; email: string; createdAt: string; ownerUid?: string };
let pool: Pool | undefined;
function database() { const url = runtimeEnv("DATABASE_URL"); if (!url) throw new Error("DATABASE_URL is required for support tickets."); pool ??= new Pool({ connectionString: url }); return pool; }
function map(row: Record<string, string>): SupportTicket { return { id: row.id, subject: row.subject, message: row.message, status: row.status as SupportTicket["status"], email: row.email, createdAt: row.created_at, ownerUid: row.owner_uid }; }
export async function createTicket(ownerUid: string, email: string, subject: string, message: string) { const result = await database().query("INSERT INTO support_tickets (id, owner_uid, email, subject, message) VALUES ($1,$2,$3,$4,$5) RETURNING *", [crypto.randomUUID(), ownerUid, email, subject, message]); return map(result.rows[0]); }
export async function listTickets(ownerUid: string) { const result = await database().query("SELECT * FROM support_tickets WHERE owner_uid = $1 ORDER BY created_at DESC", [ownerUid]); return result.rows.map(map); }
export async function listAllTickets() { const result = await database().query("SELECT * FROM support_tickets ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, created_at DESC"); return result.rows.map(map); }
export async function updateTicketStatus(id: string, status: SupportTicket["status"]) { const result = await database().query("UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [status, id]); return result.rows[0] ? map(result.rows[0]) : undefined; }
export async function adminOverview() { const result = await database().query("SELECT (SELECT COUNT(*) FROM research_workspaces)::text AS workspaces, (SELECT COUNT(*) FROM research_sessions)::text AS sessions, (SELECT COUNT(*) FROM workspace_papers)::text AS papers, (SELECT COUNT(*) FROM support_tickets WHERE status = 'open')::text AS open_tickets, (SELECT COALESCE(SUM(credits),0) FROM credit_ledger)::text AS net_credits"); return Object.fromEntries(Object.entries(result.rows[0]).map(([key, value]) => [key, Number(value)])); }
