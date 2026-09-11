import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const origin = process.env.FRONTEND_ORIGIN || "https://research-os.org";
  const response = request.method === "OPTIONS" ? new NextResponse(null, { status: 204 }) : NextResponse.next();
  if (request.headers.get("origin") === origin) { response.headers.set("Access-Control-Allow-Origin", origin); response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization"); response.headers.set("Vary", "Origin"); }
  return response;
}
export const config = { matcher: "/api/:path*" };
