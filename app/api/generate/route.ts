import { z } from "zod";
import { withOwner, bad, limited } from "@/lib/server/http";
import { generateKit } from "@/lib/ai/kit";
import { runAi } from "@/lib/ai/guard";
import { saveGeneration, serialise } from "@/lib/server/generations";
import { recordEvent } from "@/lib/server/onboarding";
import { envNumber } from "@/lib/server/env";
import { hit, peek, takeAll } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const schema = z.object({
  mode: z.enum(["tailor", "improve", "build"]),
  targetRole: z.string().max(200).default(""),
  jobDescription: z.string().max(12000).optional(),
  resume: z.string().max(16000).optional(),
  profile: z.string().max(12000).optional(),
  lang: z.enum(["en", "pt", "es"]).default("en"),
  source: z.enum(["text", "voice"]).default("text"),
  briefingId: z.string().max(64).optional(),
});

/**
 * A kit preview for anyone, a full kit behind a credit. Every call is a full generation, so it is
 * rate-limited per IP and per owner, and anonymous previews are capped per IP per day.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("missing_fields");
    const b = parsed.data;
    if (b.mode === "tailor" && ((b.jobDescription ?? "").length < 30 || (b.resume ?? "").length < 30)) return bad("posting_resume_short");
    if (b.mode === "improve" && (b.resume ?? "").length < 30) return bad("resume_short");
    if (b.mode === "build" && (b.profile ?? "").length < 20) return bad("profile_short");
    const over = takeAll([
      ["GENERATE_IP_HOUR", owner.ip],
      ["GENERATE_OWNER_HOUR", owner.key],
      ...(owner.userId ? [["GENERATE_USER_DAY", owner.userId] as ["GENERATE_USER_DAY", string]] : []),
    ]);
    if (over) return limited(over);
    // Anonymous previews: counted only when one is actually delivered, capped per IP per day.
    const anonCap = envNumber("ANON_PREVIEWS_PER_IP_PER_DAY", 3);
    if (!owner.userId) {
      const anon = peek("ANON_PREVIEW_IP_DAY", owner.ip, anonCap, 86_400);
      if (!anon.ok) return limited(anon, "account_required");
    }
    const ran = await runAi("generate", { ownerKey: owner.key, ip: owner.ip }, () => generateKit(b));
    if (!ran.ok) return ran.reply;
    const { kit, model, costUsd } = ran.value;
    const row = saveGeneration({
      userId: owner.userId, anonId: owner.anonId, mode: b.mode, source: b.source, lang: b.lang, targetRole: b.targetRole,
      input: { jobDescription: b.jobDescription, resume: b.resume, profile: b.profile, briefingId: b.briefingId }, kit, model, costUsd,
    });
    if (!owner.userId) hit("ANON_PREVIEW_IP_DAY", owner.ip, anonCap, 86_400);
    recordEvent(owner.key, "generate", { mode: b.mode, source: b.source, matchAfter: kit.matchAfter });
    return { body: serialise(row) };
  });
}
