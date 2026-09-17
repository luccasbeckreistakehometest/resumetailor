import { withOwner, bad, limited } from "@/lib/server/http";
import { aiGate, runAi } from "@/lib/ai/guard";
import { lease, takeAll } from "@/lib/server/ratelimit";
import { ownedKit } from "@/lib/server/kitAccess";
import { kitInput } from "@/lib/server/generations";
import { getVariant, saveVariant } from "@/lib/server/variants";
import { generatePitch, isPitchSeconds, templatePitch, type Pitch, type PitchSeconds } from "@/lib/ai/pitch";
import { envNumber } from "@/lib/server/env";
import { getDb } from "@/lib/server/db";
import type { Kit, Lang } from "@/lib/ai/kit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
const secondsOf = (v: unknown): PitchSeconds | null => { const n = Number(v); return isPitchSeconds(n) ? n : null; };

function feedbackLeft(id: string): number {
  const used = (getDb().prepare("SELECT COUNT(*) n FROM pitch_takes WHERE generationId = ?").get(id) as { n: number }).n;
  return Math.max(0, envNumber("PITCH_FEEDBACK_MAX_PER_KIT", 5) - used);
}

/** GET ?seconds= — the cached script, or (locked kit) a template written without AI, or null. */
export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const seconds = secondsOf(new URL(request.url).searchParams.get("seconds") ?? 60);
  return withOwner(async (owner) => {
    const kit = ownedKit(id, owner);
    if ("reply" in kit) return kit.reply;
    if (!seconds) return bad("check_fields");
    const lang = (["en", "pt", "es"].includes(kit.row.lang) ? kit.row.lang : "en") as Lang;
    if (kit.row.unlocked !== 1) {
      const k = JSON.parse(kit.row.result) as Kit;
      return { body: { pitch: templatePitch(k, kit.row.title, kit.row.targetRole, lang, seconds), source: "template", unlocked: false, feedbackLeft: 0 } };
    }
    const cached = getVariant(id, `pitch:${seconds}`);
    return { body: { pitch: cached ? JSON.parse(cached.body) as Pitch : null, source: cached ? "ai" : null, cached: !!cached, unlocked: true, feedbackLeft: feedbackLeft(id) } };
  });
}

/** POST { seconds } — writes the script for an unlocked kit (one cheap call, cached per length). */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  return withOwner(async (owner) => {
    const kit = ownedKit(id, owner, { unlocked: true });
    if ("reply" in kit) return kit.reply;
    const seconds = secondsOf(body?.seconds);
    if (!seconds) return bad("check_fields");
    const kind = `pitch:${seconds}`;
    const cached = getVariant(id, kind);
    if (cached) return { body: { pitch: JSON.parse(cached.body) as Pitch, source: "ai", cached: true, unlocked: true, feedbackLeft: feedbackLeft(id) } };
    const gate = aiGate({ ownerKey: owner.key, ip: owner.ip });
    if (gate) return gate;
    const over = takeAll([["KIT_EXTRAS_OWNER_HOUR", owner.key], ["KIT_EXTRAS_IP_HOUR", owner.ip]]);
    if (over) return limited(over);
    const slot = lease("PITCH_INFLIGHT", `${id}:${kind}`, 120);
    if (!slot.ok) return bad("rate_limited", 429);
    try {
      const again = getVariant(id, kind);
      if (again) return { body: { pitch: JSON.parse(again.body) as Pitch, source: "ai", cached: true, unlocked: true, feedbackLeft: feedbackLeft(id) } };
      const k = JSON.parse(kit.row.result) as Kit;
      const lang = (["en", "pt", "es"].includes(kit.row.lang) ? kit.row.lang : "en") as Lang;
      const ran = await runAi("pitch_script", { ownerKey: owner.key, ip: owner.ip }, () =>
        generatePitch({ kit: k, title: kit.row.title, role: kit.row.targetRole, posting: kitInput(kit.row).jobDescription ?? "", lang, seconds }));
      if (!ran.ok) return ran.reply;
      saveVariant({ generationId: id, kind, variant: { subject: "", body: JSON.stringify(ran.value.pitch) }, model: ran.value.model, costUsd: ran.value.costUsd });
      return { body: { pitch: ran.value.pitch, source: "ai", cached: false, unlocked: true, feedbackLeft: feedbackLeft(id) } };
    } finally {
      slot.release();
    }
  });
}
