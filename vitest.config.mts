import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  test: { include: ["tests/unit/**/*.test.ts"], env: { AUTH_SECRET: "test-secret-that-is-long-enough", NODE_ENV: "test" } },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
