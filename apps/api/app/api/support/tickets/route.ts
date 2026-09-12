import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/firebase-server";
import { createTicket, listTickets } from "@/lib/support/store";

export async function GET(request: Request) { const auth = await authenticate(request); if ("response" in auth) return auth.response; return NextResponse.json(await listTickets(auth.user.uid)); }
export async function POST(request: Request) { const auth = await authenticate(request); if ("response" in auth) return auth.response; const body = await request.json().catch(() => ({})); const subject = typeof body.subject === "string" ? body.subject.trim() : ""; const message = typeof body.message === "string" ? body.message.trim() : ""; if (!subject || !message) return NextResponse.json({ error: "A subject and message are required." }, { status: 400 }); if (subject.length > 160 || message.length > 5000) return NextResponse.json({ error: "Keep the subject under 160 characters and message under 5,000 characters." }, { status: 400 }); return NextResponse.json(await createTicket(auth.user.uid, auth.user.email || "", subject, message), { status: 201 }); }
