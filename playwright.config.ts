import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end against a real dev server with the AI mocked (AI_MOCK=1) and a throwaway database
 * (DATA_DIR=data/e2e, wiped by global-setup) so runs are deterministic and cost nothing.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure", screenshot: "only-on-failure", locale: "en-US" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "AI_MOCK=1 DATA_DIR=data/e2e ADMIN_EMAIL=admin@resumetailor.app ADMIN_PASSWORD=resumetailor2026 FIT_CHECKS_PER_DAY=3 npx next dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
