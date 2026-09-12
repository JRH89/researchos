import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const origin = process.env["FRONTEND_ORIGIN"] || "https://research-os.org";
  const allowedOrigins = new Set([origin]);
  if (process.env["NODE_ENV"] !== "production") allowedOrigins.add("http://localhost:3000");
  const response = request.method === "OPTIONS" ? new NextResponse(null, { status: 204 }) : NextResponse.next();
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && allowedOrigins.has(requestOrigin)) { response.headers.set("Access-Control-Allow-Origin", requestOrigin); response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS"); response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization"); response.headers.set("Vary", "Origin"); }
  return response;
}
export const config = { matcher: "/api/:path*" };
