import { z } from "zod";
import { withOwner, bad, limited } from "@/lib/server/http";
import { runAi } from "@/lib/ai/guard";
import { analyseFit } from "@/lib/ai/fit";
import { fitHash, fitUsage, getCachedFit, saveFit, serialiseFit } from "@/lib/server/fit";
import { recordEvent } from "@/lib/server/onboarding";
import { take } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const schema = z.object({ posting: z.string().min(30).max(12000), resume: z.string().min(30).max(16000), lang: z.enum(["en", "pt", "es"]).default("en") });

/**
 * "Am I a fit?" — free, no credit. The same pair of texts is answered from the cache for anyone;
 * a new pair costs one AI call and counts against the caller's rolling daily cap and the IP's.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("posting_resume_short");
    const { posting, resume, lang } = parsed.data;
    const hash = fitHash(posting, resume, lang);
    const cached = getCachedFit(hash);
    if (cached) return { body: serialiseFit(cached, true, fitUsage(owner.key)) };
    const usage = fitUsage(owner.key);
    if (usage.left <= 0) return { body: { error: "limit", resetsAt: usage.resetsAt }, status: 429 };
    const ip = take("FIT_IP_HOUR", owner.ip);
    if (!ip.ok) return limited(ip);
    const ran = await runAi("fit", { ownerKey: owner.key, ip: owner.ip }, () => analyseFit({ posting, resume, lang }));
    if (!ran.ok) return ran.reply;
    const { result, model, costUsd } = ran.value;
    const row = saveFit({ ownerKey: owner.key, hash, lang, result, model, costUsd });
    recordEvent(owner.key, "fit_check", { score: serialiseFit(row, false, usage).score, items: result.items.length });
    return { body: serialiseFit(row, false, fitUsage(owner.key)) };
  });
}

export async function GET() {
  return withOwner(async (owner) => ({ body: fitUsage(owner.key) }));
}
