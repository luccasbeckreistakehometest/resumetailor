import { z } from "zod";
import { withOwner, bad } from "@/lib/server/http";
import { extractBriefing } from "@/lib/ai/voice";
import { aiConfigured, describeAiError } from "@/lib/ai/client";
import { getDb, newId, nowIso } from "@/lib/server/db";
import { recordEvent } from "@/lib/server/onboarding";

export const runtime = "nodejs";

const schema = z.object({ transcript: z.string().min(3).max(8000), lang: z.enum(["en", "pt", "es"]).default("en"), priorSummary: z.string().max(2000).optional(), briefingId: z.string().optional() });

/** The listener sends each turn's transcript; the reply says what was understood and what to ask next. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("Say a little more and try again.");
    if (!aiConfigured()) return bad("The AI service is not configured yet.", 503);
    try {
      const { briefing } = await extractBriefing(parsed.data);
      const id = parsed.data.briefingId ?? newId("vb");
      const db = getDb();
      const existing = db.prepare("SELECT transcript FROM voice_briefings WHERE id = ?").get(id) as { transcript: string } | undefined;
      const transcript = existing ? `${existing.transcript}\n${parsed.data.transcript}` : parsed.data.transcript;
      db.prepare("INSERT INTO voice_briefings (id,ownerId,lang,transcript,extracted,createdAt) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET transcript=excluded.transcript, extracted=excluded.extracted")
        .run(id, owner.key, parsed.data.lang, transcript, JSON.stringify(briefing), nowIso());
      recordEvent(owner.key, "voice_turn", { missing: briefing.missing.length });
      return { body: { briefingId: id, briefing } };
    } catch (error) {
      console.error("voice extract", error);
      return bad(describeAiError(error), 502);
    }
  });
}
