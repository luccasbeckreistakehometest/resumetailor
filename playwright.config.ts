import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end against a real dev server with the AI mocked (AI_MOCK=1), Mercado Pago payments read
 * from files the tests write (MP_API_MOCK_DIR) and a throwaway database (DATA_DIR=data/e2e, wiped
 * by global-setup), so runs are deterministic and cost nothing. Rate limits run at their defaults;
 * each test browses from its own X-Forwarded-For address (tests/e2e/fixtures.ts).
 */
// No NEXT_DEV_FS_CACHE=0 here: with the Turbopack cache kept in memory the dev server grew past
// 15 GB during a full run and filled the disk through swap.
const PORT = 3100;
const ENV = [
  "AI_MOCK=1", "NODE_OPTIONS=--max-old-space-size=4096", "NEXT_DEV_MEMORY_EVICTION=full", "DATA_DIR=data/e2e", `NEXT_PUBLIC_BASE_URL=http://localhost:${PORT}`,
  "ADMIN_EMAIL=admin@resumetailor.app", "ADMIN_PASSWORD=resumetailor2026", "FIT_CHECKS_PER_DAY=3",
  "AUTH_SECRET=e2e-only-secret-not-used-anywhere-else-0000",
  "MP_ACCESS_TOKEN=TEST-e2e-fake-token", "MP_API_MOCK_DIR=data/e2e/mp", "AI_PROBE_RETRY_SECONDS=8",
  "STRIPE_SECRET_KEY=", "TAVILY_API_KEY=", "ELEVENLABS_API_KEY=", "OPENAI_API_KEY=", "SUPPORT_EMAIL=", "SUPPORT_WHATSAPP=",
  "NEXT_PUBLIC_SUPPORT_WHATSAPP=", "NEXT_PUBLIC_SUPPORT_EMAIL=", "LEGAL_NAME=", "LEGAL_DOCUMENT=", "LEGAL_ADDRESS=", "LEGAL_EMAIL=",
].join(" ");

export const E2E_SERVER_COMMAND = `${ENV} npx next dev -p ${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure", locale: "en-US" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    // Phone width: menu, sign-out and no sideways scrolling on the main pages.
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: E2E_SERVER_COMMAND,
    url: `http://localhost:${PORT}`,
    // E2E_REUSE=1: run against a server started by hand with the same env (for debugging it).
    reuseExistingServer: process.env.E2E_REUSE === "1",
    timeout: 120_000,
  },
});
