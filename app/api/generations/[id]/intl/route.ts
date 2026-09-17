import { withOwner, bad, limited } from "@/lib/server/http";
import { aiGate, runAi } from "@/lib/ai/guard";
import { lease, takeAll } from "@/lib/server/ratelimit";
import { ownedKit } from "@/lib/server/kitAccess";
import { getDb } from "@/lib/server/db";
import { envNumber } from "@/lib/server/env";
import { getVariant, saveVariant } from "@/lib/server/variants";
import { generateIntl, type IntlVersion } from "@/lib/ai/intl";
import { missingNumbers } from "@/lib/ats/truth";
import type { Kit, Lang } from "@/lib/ai/kit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
const LANGS: Lang[] = ["en", "pt", "es"];
const langsOf = (raw: string | null | undefined): Lang[] => { try { return (JSON.parse(raw || "[]") as string[]).filter((l): l is Lang => LANGS.includes(l as Lang)); } catch { return []; } };
const view = (target: Lang, v: IntlVersion, kit: Kit, cached: boolean, used: Lang[]) => ({
  target, ...v, cached, used, left: Math.max(0, envNumber("KIT_INTL_MAX", 2) - used.length),
  missingNumbers: missingNumbers(kit.resume, v.resume),
});

/** GET ?target= — a version already written (or null), and how many languages are left. */
export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const target = new URL(request.url).searchParams.get("target") as Lang | null;
  return withOwner(async (owner) => {
    const kit = ownedKit(id, owner, { unlocked: true });
    if ("reply" in kit) return kit.reply;
    const used = langsOf(kit.row.intlLangs);
    const k = JSON.parse(kit.row.result) as Kit;
    const v = target && LANGS.includes(target) ? getVariant(id, `intl:${target}`) : null;
    return { body: { version: v ? view(target!, JSON.parse(v.body) as IntlVersion, k, true, used) : null, used, left: Math.max(0, envNumber("KIT_INTL_MAX", 2) - used.length) } };
  });
}

/**
 * POST { target } — writes the version (unlocked kits only). Each new language counts against
 * KIT_INTL_MAX (claimed before the call, given back if it fails); a language already used is free.
 */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  return withOwner(async (owner) => {
    const kit = ownedKit(id, owner, { unlocked: true });
    if ("reply" in kit) return kit.reply;
    const target = body?.target as Lang;
    const from = (LANGS.includes(kit.row.lang as Lang) ? kit.row.lang : "en") as Lang;
    if (!LANGS.includes(target) || target === from) return bad("check_fields");
    const k = JSON.parse(kit.row.result) as Kit;
    const cached = getVariant(id, `intl:${target}`);
    const db = getDb();
    if (cached) return { body: view(target, JSON.parse(cached.body) as IntlVersion, k, true, langsOf((db.prepare("SELECT intlLangs FROM generations WHERE id = ?").get(id) as { intlLangs: string }).intlLangs)) };
    const max = envNumber("KIT_INTL_MAX", 2);
    const claim = db.transaction(() => {
      const used = langsOf((db.prepare("SELECT intlLangs FROM generations WHERE id = ?").get(id) as { intlLangs: string }).intlLangs);
      if (used.includes(target)) return used;
      if (used.length >= max) return null;
      const next = [...used, target];
      db.prepare("UPDATE generations SET intlLangs = ? WHERE id = ?").run(JSON.stringify(next), id);
      return next;
    }).immediate();
    if (!claim) return { body: { error: "limit" }, status: 429 };
    const release = () => db.transaction(() => {
      const used = langsOf((db.prepare("SELECT intlLangs FROM generations WHERE id = ?").get(id) as { intlLangs: string }).intlLangs);
      db.prepare("UPDATE generations SET intlLangs = ? WHERE id = ?").run(JSON.stringify(used.filter((l) => l !== target)), id);
    }).immediate();
    const gate = aiGate({ ownerKey: owner.key, ip: owner.ip });
    if (gate) { release(); return gate; }
    const over = takeAll([["KIT_EXTRAS_OWNER_HOUR", owner.key], ["KIT_EXTRAS_IP_HOUR", owner.ip]]);
    if (over) { release(); return limited(over); }
    const slot = lease("INTL_INFLIGHT", `${id}:${target}`, 180);
    if (!slot.ok) { release(); return bad("rate_limited", 429); }
    try {
      const ran = await runAi("intl", { ownerKey: owner.key, ip: owner.ip }, () => generateIntl({ kit: k, from, target, role: kit.row.targetRole }));
      if (!ran.ok) { release(); return ran.reply; }
      saveVariant({ generationId: id, kind: `intl:${target}`, variant: { subject: "", body: JSON.stringify(ran.value.version) }, model: ran.value.model, costUsd: ran.value.costUsd });
      return { body: view(target, ran.value.version, k, false, claim) };
    } finally {
      slot.release();
    }
  });
}
