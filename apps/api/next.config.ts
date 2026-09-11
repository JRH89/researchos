import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = existsSync(resolve(process.cwd(), ".env")) ? process.cwd() : resolve(process.cwd(), "../..");
loadEnvConfig(repositoryRoot);
const nextConfig: NextConfig = { reactStrictMode: true, serverExternalPackages: ["pdfkit"] };
export default nextConfig;
