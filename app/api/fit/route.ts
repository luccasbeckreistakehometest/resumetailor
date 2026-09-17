import { z } from "zod";
import { withOwner, bad } from "@/lib/server/http";
import { aiConfigured, describeAiError } from "@/lib/ai/client";
import { analyseFit } from "@/lib/ai/fit";
import { fitHash, fitUsage, getCachedFit, saveFit, serialiseFit } from "@/lib/server/fit";
import { recordEvent } from "@/lib/server/onboarding";

export const runtime = "nodejs";

const schema = z.object({ posting: z.string().min(30).max(12000), resume: z.string().min(30).max(16000), lang: z.enum(["en", "pt", "es"]).default("en") });

/**
 * "Am I a fit?" — free, no credit. The same pair of texts is answered from the cache for anyone;
 * a new pair costs one AI call and counts against the caller's rolling daily cap.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("Paste the whole posting and the whole résumé — a few lines each at least.");
    const { posting, resume, lang } = parsed.data;
    const hash = fitHash(posting, resume, lang);
    const cached = getCachedFit(hash);
    if (cached) return { body: serialiseFit(cached, true, fitUsage(owner.key)) };
    if (!aiConfigured()) return bad("The AI service is not configured yet.", 503);
    const usage = fitUsage(owner.key);
    if (usage.left <= 0) return { body: { error: "limit", resetsAt: usage.resetsAt }, status: 429 };
    try {
      const { result, model, costUsd } = await analyseFit({ posting, resume, lang });
      const row = saveFit({ ownerKey: owner.key, hash, lang, result, model, costUsd });
      recordEvent(owner.key, "fit_check", { score: serialiseFit(row, false, usage).score, items: result.items.length });
      return { body: serialiseFit(row, false, fitUsage(owner.key)) };
    } catch (error) {
      console.error("fit", error);
      return bad(describeAiError(error), 502);
    }
  });
}

export async function GET() {
  return withOwner(async (owner) => ({ body: fitUsage(owner.key) }));
}
