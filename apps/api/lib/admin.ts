import type { AuthenticatedUser } from "@/lib/auth/firebase-server";
import { runtimeEnv } from "@/lib/runtime-env";

export function isAdmin(user: AuthenticatedUser) {
  const emails = (runtimeEnv("ADMIN_EMAILS") || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return Boolean(user.email && emails.includes(user.email.toLowerCase()));
}
