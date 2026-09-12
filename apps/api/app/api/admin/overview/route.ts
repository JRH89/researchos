import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/firebase-server";
import { isAdmin } from "@/lib/admin";
import { adminOverview } from "@/lib/support/store";

export async function GET(request: Request) { const auth = await authenticate(request); if ("response" in auth) return auth.response; if (!isAdmin(auth.user)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 }); return NextResponse.json(await adminOverview()); }
