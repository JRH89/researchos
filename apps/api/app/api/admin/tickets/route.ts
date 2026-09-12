import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/firebase-server";
import { isAdmin } from "@/lib/admin";
import { listAllTickets, updateTicketStatus } from "@/lib/support/store";

export async function GET(request: Request) { const auth = await authenticate(request); if ("response" in auth) return auth.response; if (!isAdmin(auth.user)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 }); return NextResponse.json(await listAllTickets()); }
export async function PATCH(request: Request) { const auth = await authenticate(request); if ("response" in auth) return auth.response; if (!isAdmin(auth.user)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 }); const body = await request.json().catch(() => ({})); if (typeof body.id !== "string" || !["open", "in_progress", "closed"].includes(body.status)) return NextResponse.json({ error: "A ticket ID and valid status are required." }, { status: 400 }); const ticket = await updateTicketStatus(body.id, body.status); return ticket ? NextResponse.json(ticket) : NextResponse.json({ error: "Ticket not found." }, { status: 404 }); }
