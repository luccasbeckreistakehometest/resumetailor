import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end against a PRODUCTION build served by `next start` (scripts/e2e-server.sh): AI mocked
 * (AI_MOCK=1), Mercado Pago payments read from files the tests write (MP_API_MOCK_DIR, honoured in
 * production only with E2E_TEST_MODE=1) and a throwaway database (data/e2e, wiped by the script
 * before the server opens it). Rate limits run at their defaults; each test browses from its own
 * X-Forwarded-For address (tests/e2e/fixtures.ts). `next dev` was dropped here: on this Mac its
 * memory footprint passed 12 GB during a full run.
 */
const PORT = 3100;

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
    command: "sh scripts/e2e-server.sh",
    url: `http://localhost:${PORT}/api/health`,
    // E2E_REUSE=1: run against a server started by hand (sh scripts/e2e-server.sh).
    reuseExistingServer: process.env.E2E_REUSE === "1",
    timeout: 900_000,
  },
});
