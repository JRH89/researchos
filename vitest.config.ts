import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./apps/api/", import.meta.url)) } },
  test: { environment: "node", include: ["apps/api/**/*.test.ts"] }
});
