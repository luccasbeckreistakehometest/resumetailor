/**
 * Runs once when the server starts (not during `next build`): makes sure the admin account matches
 * the env, and probes the AI key so the site admits a dead key from the first request instead of
 * after a visitor fills in the whole flow.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NODE_ENV === "production" && process.env.E2E_TEST_MODE === "1") {
    console.warn("[boot] E2E_TEST_MODE=1: test fixtures (mocked payment lookups) are enabled — never set this on a real server.");
  }
  try {
    const { ensureAdmin } = await import("@/lib/server/users");
    await ensureAdmin();
  } catch (error) {
    console.error("[boot] admin sync failed", error);
  }
  const { refreshAiHealth } = await import("@/lib/ai/health");
  void refreshAiHealth().catch(() => {});
}
