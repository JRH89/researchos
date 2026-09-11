import { NextResponse } from "next/server";
import { configuredTransports } from "@/lib/mcp/registry";
import { runtimeEnv } from "@/lib/runtime-env";

export async function GET() {
  try {
    return NextResponse.json({ status: "ok", mcpServers: configuredTransports().map((transport) => transport.serverName), modelProvider: runtimeEnv("ANTHROPIC_API_KEY") ? "anthropic" : runtimeEnv("OPENAI_API_KEY") ? "openai-compatible" : "none", persistenceConfigured: Boolean(runtimeEnv("DATABASE_URL")) });
  } catch (error) {
    return NextResponse.json({ status: "misconfigured", detail: error instanceof Error ? error.message : "Unknown configuration error" }, { status: 503 });
  }
}
