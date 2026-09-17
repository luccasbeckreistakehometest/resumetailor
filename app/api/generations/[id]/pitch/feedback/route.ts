import { z } from "zod";
import { withOwner, bad, limited } from "@/lib/server/http";
import { aiGate, runAi } from "@/lib/ai/guard";
import { lease, takeAll } from "@/lib/server/ratelimit";
import { ownedKit } from "@/lib/server/kitAccess";
import { getDb, newId, nowIso } from "@/lib/server/db";
import { envNumber } from "@/lib/server/env";
import { pitchFeedback } from "@/lib/ai/pitch";
import { deliveryMetrics } from "@/lib/speech/metrics";
import { serverEvent } from "@/lib/server/analytics";
import type { Lang } from "@/lib/ai/kit";

export const runtime = "nodejs";
const schema = z.object({ seconds: z.number().min(1).max(600), transcript: z.string().min(20).max(6000), target: z.number().int().min(30).max(180).default(60), pauses: z.array(z.number()).max(400).optional() });

/**
 * "Rate this take": the transcript and the delivery numbers go to one cheap call; only the
 * numbers and the coaching are kept (no video, no transcript). Capped per kit; the slot is taken
 * before the call (a pending row) and removed if the call fails.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    const kit = ownedKit(id, owner, { unlocked: true });
    if ("reply" in kit) return kit.reply;
    if (!parsed.success) return bad("answer_short");
    const gate = aiGate({ ownerKey: owner.key, ip: owner.ip });
    if (gate) return gate;
    const over = takeAll([["KIT_EXTRAS_OWNER_HOUR", owner.key], ["KIT_EXTRAS_IP_HOUR", owner.ip]]);
    if (over) return limited(over);
    const lang = (["en", "pt", "es"].includes(kit.row.lang) ? kit.row.lang : "en") as Lang;
    const delivery = deliveryMetrics(parsed.data.transcript, parsed.data.seconds, lang, parsed.data.pauses);
    const db = getDb();
    const max = envNumber("PITCH_FEEDBACK_MAX_PER_KIT", 5);
    const slot = lease("PITCH_FEEDBACK_INFLIGHT", id, 120);
    if (!slot.ok) return bad("rate_limited", 429);
    const takeId = newId("take");
    try {
      const claimed = db.transaction(() => {
        const used = (db.prepare("SELECT COUNT(*) n FROM pitch_takes WHERE generationId = ?").get(id) as { n: number }).n;
        if (used >= max) return false;
        db.prepare("INSERT INTO pitch_takes (id,generationId,ownerKey,seconds,metrics,createdAt) VALUES (?,?,?,?,?,?)").run(takeId, id, owner.key, parsed.data.target, JSON.stringify(delivery), nowIso());
        return true;
      }).immediate();
      if (!claimed) return { body: { error: "limit" }, status: 429 };
      const ran = await runAi("pitch_feedback", { ownerKey: owner.key, ip: owner.ip }, () =>
        pitchFeedback({ transcript: parsed.data.transcript, delivery, seconds: parsed.data.target, lang, role: kit.row.targetRole }));
      if (!ran.ok) { db.prepare("DELETE FROM pitch_takes WHERE id = ?").run(takeId); return ran.reply; }
      db.prepare("UPDATE pitch_takes SET feedback = ?, costUsd = ? WHERE id = ?").run(JSON.stringify(ran.value.feedback), ran.value.costUsd, takeId);
      serverEvent(owner, "pitch_record", { seconds: parsed.data.target });
      const used = (db.prepare("SELECT COUNT(*) n FROM pitch_takes WHERE generationId = ?").get(id) as { n: number }).n;
      return { body: { feedback: ran.value.feedback, delivery, feedbackLeft: Math.max(0, max - used) } };
    } finally {
      slot.release();
    }
  });
}
