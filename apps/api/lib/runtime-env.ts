import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";

let loaded = false;
export function loadRuntimeEnv() {
  if (loaded) return;
  // Vitest controls process.env per test. Loading the developer's real .env
  // here would overwrite a test's deliberately isolated provider settings.
  if (process.env["VITEST"]) { loaded = true; return; }
  const repositoryRoot = existsSync(resolve(process.cwd(), ".env")) ? process.cwd() : resolve(process.cwd(), "../..");
  const isTest = process.env["NODE_ENV"] === "test";
  loadEnvConfig(repositoryRoot, !isTest && process.env["NODE_ENV"] !== "production", console, !isTest);
  loaded = true;
}

// Use bracket access so Next does not replace server-only values at build time.
// The API is built without production secrets and receives them only at runtime.
export function runtimeEnv(name: string) {
  loadRuntimeEnv();
  return process.env[name];
}
