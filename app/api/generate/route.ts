import { z } from "zod";
import { withOwner, bad, limited } from "@/lib/server/http";
import { generateKit } from "@/lib/ai/kit";
import { runAi } from "@/lib/ai/guard";
import { saveGeneration, serialise } from "@/lib/server/generations";
import { recordEvent } from "@/lib/server/onboarding";
import { envNumber } from "@/lib/server/env";
import { reserveSpecs, takeAll } from "@/lib/server/ratelimit";
import { saveProfile } from "@/lib/server/profiles";
import { getDb } from "@/lib/server/db";
import { briefingFacts, type Briefing } from "@/lib/ai/voice";
import { emptyFacts, factKey, factsText, type ProfileFacts } from "@/lib/profile/facts";
import { serverEvent } from "@/lib/server/analytics";

/**
 * The facts said out loud in a briefing the caller owns, filtered to the ones the person kept.
 * Never taken from the request body: the client can only remove items, not add them.
 */
function spokenFor(briefingId: string, owner: { key: string; anonId: string }, kept: string[] | undefined): { facts: ProfileFacts } | "forbidden" | null {
  const row = getDb().prepare("SELECT ownerId, extracted FROM voice_briefings WHERE id = ?").get(briefingId) as { ownerId: string; extracted: string } | undefined;
  if (!row) return null;
  if (row.ownerId !== owner.key && row.ownerId !== owner.anonId) return "forbidden";
  let b: Briefing;
  try { b = JSON.parse(row.extracted) as Briefing; } catch { return null; }
  const all = briefingFacts(b);
  if (!kept) return { facts: all };
  const keep = new Set(kept.map(factKey));
  return { facts: { ...emptyFacts(), achievements: all.achievements.filter((f) => keep.has(factKey(f))), tools: all.tools.filter((f) => keep.has(factKey(f))) } };
}

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
  /** Keep this résumé as the base for the next kits (on by default). */
  remember: z.boolean().default(true),
  /** Which of the briefing's facts the person kept (a subset of what the server derived). */
  spokenFacts: z.array(z.string().max(300)).max(40).optional(),
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
    const spoken = b.briefingId && b.mode !== "build" ? spokenFor(b.briefingId, owner, b.spokenFacts) : null;
    if (spoken === "forbidden") return bad("forbidden", 403);
    const spokenText = spoken ? factsText(spoken.facts) : "";
    const over = takeAll([
      ["GENERATE_IP_HOUR", owner.ip],
      ["GENERATE_OWNER_HOUR", owner.key],
      ...(owner.userId ? [["GENERATE_USER_DAY", owner.userId] as ["GENERATE_USER_DAY", string]] : []),
    ]);
    if (over) return limited(over);
    // Anonymous previews: capped per IP per day. The slot is claimed before the (slow) generation,
    // so a parallel burst cannot pass the cap, and given back when no preview was delivered.
    const anonSlot = owner.userId ? null
      : reserveSpecs([{ bucket: "ANON_PREVIEW_IP_DAY", key: owner.ip, max: envNumber("ANON_PREVIEWS_PER_IP_PER_DAY", 3), windowSec: 86_400 }]);
    if (anonSlot && !anonSlot.ok) return limited(anonSlot.failed, "account_required");
    const ran = await runAi("generate", { ownerKey: owner.key, ip: owner.ip }, () => generateKit({ ...b, spoken: spokenText || undefined }));
    if (!ran.ok) { if (anonSlot?.ok) anonSlot.release(); return ran.reply; }
    const { kit, model, costUsd } = ran.value;
    const row = saveGeneration({
      userId: owner.userId, anonId: owner.anonId, mode: b.mode, source: b.source, lang: b.lang, targetRole: b.targetRole,
      input: { jobDescription: b.jobDescription, resume: b.resume, profile: b.profile, briefingId: b.briefingId, ...(spokenText ? { spoken: spokenText } : {}), ...(b.mode === "build" && b.remember ? { remember: true } : {}) }, kit, model, costUsd,
    });
    if (b.remember && b.mode !== "build" && b.resume) saveProfile(owner.key, { resume: b.resume, role: b.targetRole, facts: spoken?.facts });
    serverEvent(owner, "preview_ready", { mode: b.mode, source: b.source });
    recordEvent(owner.key, "generate", { mode: b.mode, source: b.source, matchAfter: kit.matchAfter });
    return { body: serialise(row) };
  });
}
