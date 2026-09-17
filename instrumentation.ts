/**
 * Runs once when the server starts (not during `next build`): probes the AI key so the site
 * admits a dead key from the first request instead of after a visitor fills in the whole flow.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { refreshAiHealth } = await import("@/lib/ai/health");
  void refreshAiHealth().catch(() => {});
}
