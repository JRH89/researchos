import { NextResponse } from "next/server";
import { configuredTransports } from "@/lib/mcp/registry";

export async function GET() {
  try {
    return NextResponse.json({ status: "ok", mcpServers: configuredTransports().map((transport) => transport.serverName), modelProvider: process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.OPENAI_API_KEY ? "openai-compatible" : "none", persistenceConfigured: Boolean(process.env.DATABASE_URL) });
  } catch (error) {
    return NextResponse.json({ status: "misconfigured", detail: error instanceof Error ? error.message : "Unknown configuration error" }, { status: 503 });
  }
}
