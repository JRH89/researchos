import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/firebase-server";
import { accountLibrary } from "@/lib/research/store";

export async function GET(request: Request) { const auth = await authenticate(request); if ("response" in auth) return auth.response; return NextResponse.json(await accountLibrary(auth.user.uid)); }
