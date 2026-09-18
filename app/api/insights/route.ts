import { createHash } from "node:crypto";
import { z } from "zod";
import { withOwner } from "@/lib/server/http";
import { companyInsights, insightsEnabled, type Insights } from "@/lib/ai/insights";
import { aiGate, runAi } from "@/lib/ai/guard";
import { getDb, nowIso } from "@/lib/server/db";
import { takeAll } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const schema = z.object({ jobDescription: z.string().min(30).max(12000) });
const OFF: Insights = { enabled: false, found: false };

/**
 * Public company facts for a posting. Only for visitors the app already knows (a session or the
 * anonymous cookie set by an earlier call), cached per posting for everyone, and rate-limited:
 * each miss is two model calls and three searches.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!insightsEnabled()) return { body: OFF };
    if (!parsed.success) return { body: { enabled: true, found: false } };
    if (owner.isNewAnon) return { body: { enabled: true, found: false } };
    const hash = createHash("sha256").update(parsed.data.jobDescription.trim().toLowerCase().replace(/\s+/g, " ")).digest("hex");
    const db = getDb();
    const cached = db.prepare("SELECT result FROM insights_cache WHERE hash = ?").get(hash) as { result: string } | undefined;
    if (cached) return { body: JSON.parse(cached.result) };
    if (aiGate(owner)) return { body: { enabled: true, found: false } };
    if (takeAll([["INSIGHTS_IP_HOUR", owner.ip], ["INSIGHTS_OWNER_DAY", owner.key]])) return { body: { enabled: true, found: false } };
    const ran = await runAi("insights", owner, () => companyInsights(parsed.data.jobDescription));
    if (!ran.ok) return { body: { enabled: true, found: false } };
    const { insights } = ran.value;
    if (insights.enabled) db.prepare("INSERT INTO insights_cache (hash, result, createdAt) VALUES (?, ?, ?) ON CONFLICT(hash) DO NOTHING").run(hash, JSON.stringify(insights), nowIso());
    return { body: insights };
  });
}
