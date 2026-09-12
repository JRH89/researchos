import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/firebase-server";
import { createTicket, listTickets } from "@/lib/support/store";

export async function GET(request: Request) { const auth = await authenticate(request); if ("response" in auth) return auth.response; return NextResponse.json(await listTickets(auth.user.uid)); }
export async function POST(request: Request) {
  const auth = request.headers.has("authorization") ? await authenticate(request) : undefined;
  if (auth && "response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!subject || !message || !email) return NextResponse.json({ error: "A contact email, subject, and message are required." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid contact email address." }, { status: 400 });
  if (subject.length > 160 || message.length > 5000 || email.length > 254) return NextResponse.json({ error: "Keep the contact email, subject, and message within the allowed limits." }, { status: 400 });
  return NextResponse.json(await createTicket(auth && "user" in auth ? auth.user.uid : undefined, email, subject, message), { status: 201 });
}
