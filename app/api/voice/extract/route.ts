import { z } from "zod";
import { withOwner, bad, limited } from "@/lib/server/http";
import { briefingFacts, extractBriefing } from "@/lib/ai/voice";
import { envNumber } from "@/lib/server/env";
import { runAi } from "@/lib/ai/guard";
import { getDb, newId, nowIso } from "@/lib/server/db";
import { recordEvent } from "@/lib/server/onboarding";
import { reserve, takeAll } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const schema = z.object({
  transcript: z.string().min(3).max(8000), lang: z.enum(["en", "pt", "es"]).default("en"),
  priorSummary: z.string().max(2000).optional(), briefingId: z.string().max(64).optional(),
});

/**
 * The listener sends each turn's transcript; the reply says what was understood and what to ask
 * next. Only for visitors the app already knows (the pages set the visitor cookie first), capped
 * per IP per hour and per day, per owner per hour, per briefing (VOICE_MAX_TURNS), and in new
 * briefings per owner and per IP per day (so leaving out the id does not reset the turn cap).
 * Someone else's briefing id is refused.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("answer_short");
    if (owner.isNewAnon) return bad("forbidden", 403);
    const db = getDb();
    // A briefing can only be continued by whoever started it; someone else's id is refused.
    const existing = parsed.data.briefingId
      ? db.prepare("SELECT ownerId, transcript FROM voice_briefings WHERE id = ?").get(parsed.data.briefingId) as { ownerId: string; transcript: string } | undefined
      : undefined;
    if (parsed.data.briefingId && existing && existing.ownerId !== owner.key && existing.ownerId !== owner.anonId) return bad("forbidden", 403);
    const over = takeAll([["VOICE_IP_HOUR", owner.ip], ["VOICE_IP_DAY", owner.ip], ["VOICE_OWNER_HOUR", owner.key]]);
    if (over) return limited(over);
    // Turns per briefing are capped; the turn is claimed before the AI call and given back if it fails.
    const maxTurns = envNumber("VOICE_MAX_TURNS", 8);
    if (existing && db.prepare("UPDATE voice_briefings SET turns = turns + 1 WHERE id = ? AND turns < ?").run(parsed.data.briefingId, maxTurns).changes === 0) {
      return { body: { error: "voice_turns_limit" }, status: 429 };
    }
    const fresh = existing ? null : reserve([["VOICE_BRIEFINGS_OWNER_DAY", owner.key], ["VOICE_BRIEFINGS_IP_DAY", owner.ip]]);
    if (fresh && !fresh.ok) return limited(fresh.failed, "voice_turns_limit");
    const ran = await runAi("voice_extract", { ownerKey: owner.key, ip: owner.ip }, () => extractBriefing(parsed.data));
    if (!ran.ok) {
      if (existing) db.prepare("UPDATE voice_briefings SET turns = turns - 1 WHERE id = ? AND turns > 1").run(parsed.data.briefingId);
      if (fresh?.ok) fresh.release();
      return ran.reply;
    }
    const { briefing } = ran.value;
    const id = existing ? parsed.data.briefingId! : newId("vb");
    const transcript = existing ? `${existing.transcript}\n${parsed.data.transcript}` : parsed.data.transcript;
    if (existing) {
      db.prepare("UPDATE voice_briefings SET transcript = ?, extracted = ?, ownerId = ? WHERE id = ?").run(transcript, JSON.stringify(briefing), owner.key, id);
    } else {
      db.prepare("INSERT INTO voice_briefings (id,ownerId,lang,transcript,extracted,createdAt) VALUES (?,?,?,?,?,?)")
        .run(id, owner.key, parsed.data.lang, transcript, JSON.stringify(briefing), nowIso());
    }
    recordEvent(owner.key, "voice_turn", { missing: briefing.missing.length });
    return { body: { briefingId: id, briefing, facts: briefingFacts(briefing) } };
  });
}
