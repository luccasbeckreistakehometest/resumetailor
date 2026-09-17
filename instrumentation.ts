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
  const { missingSellerIdentity, isProduction, secretEnv } = await import("@/lib/server/env");
  const missing = missingSellerIdentity();
  if (isProduction() && missing.length && (secretEnv("MP_ACCESS_TOKEN") || secretEnv("STRIPE_SECRET_KEY"))) {
    console.error(`[boot] checkout is OFF until the seller is identified on the legal pages — set ${missing.join(", ")} (Decreto 7.962/2013, LGPD art. 9).`);
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
