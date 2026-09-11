import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { NextResponse } from "next/server";

export type AuthenticatedUser = { uid: string; email?: string | null; name?: string | null };

function developmentBypass() {
  return process.env.NODE_ENV !== "production" && process.env.RESEARCHOS_AUTH_MODE === "disabled";
}

function adminAuth() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON on the API server.");
  const serviceAccount = JSON.parse(raw) as Record<string, string>;
  return getAuth(getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) }));
}

export async function authenticate(request: Request): Promise<{ user: AuthenticatedUser } | { response: NextResponse }> {
  if (developmentBypass()) return { user: { uid: "local-development-user", email: "local@example.test" } };
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return { response: NextResponse.json({ error: "Authentication is required." }, { status: 401 }) };
  try {
    const decoded = await adminAuth().verifyIdToken(token, true);
    return { user: { uid: decoded.uid, email: decoded.email, name: decoded.name } };
  } catch {
    return { response: NextResponse.json({ error: "Your sign-in session is invalid or expired." }, { status: 401 }) };
  }
}
