import { NextResponse } from "next/server";
import { withOwner, bad, jsonError, limited } from "@/lib/server/http";
import { take } from "@/lib/server/ratelimit";
import { ownedKit } from "@/lib/server/kitAccess";
import { getVariant } from "@/lib/server/variants";
import { buildDocx, DOCX_MIME, fileBase, toPlainText, type ExportDoc, type ExportLang } from "@/lib/resume/export";
import { recordEvent } from "@/lib/server/onboarding";
import type { Kit } from "@/lib/ai/kit";
import { serverEvent } from "@/lib/server/analytics";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

/**
 * GET ?doc=resume|cover&format=docx|txt[&variant=intl:en] — an unlocked kit's document as a Word
 * file or plain text, named after the candidate and the role. Capped per kit per day.
 */
export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const doc = (url.searchParams.get("doc") ?? "resume") as ExportDoc;
  const format = url.searchParams.get("format") ?? "docx";
  const variant = url.searchParams.get("variant");
  if (!["resume", "cover"].includes(doc) || !["docx", "txt"].includes(format) || (variant && !/^intl:(en|pt|es)$/.test(variant))) return jsonError("bad_request");
  let file: { body: Uint8Array | string; type: string; name: string } | null = null;
  const res = await withOwner(async (owner) => {
    const kit = ownedKit(id, owner, { unlocked: true });
    if ("reply" in kit) return kit.reply;
    const k = JSON.parse(kit.row.result) as Kit;
    let lang = (["en", "pt", "es"].includes(kit.row.lang) ? kit.row.lang : "en") as ExportLang;
    let text = doc === "resume" ? k.resume : k.coverLetter;
    if (variant) {
      const v = getVariant(id, variant);
      if (!v) return bad("not_found", 404);
      const body = JSON.parse(v.body) as { resume: string; coverLetter: string };
      text = doc === "resume" ? body.resume : body.coverLetter;
      lang = variant.slice(5) as ExportLang;
    }
    const rl = take("KIT_EXPORT_KIT_DAY", id);
    if (!rl.ok) return limited(rl);
    const name = kit.row.title;
    const base = fileBase(doc, lang, name, kit.row.targetRole);
    file = format === "docx"
      ? { body: new Uint8Array(await buildDocx(text, doc, base)), type: DOCX_MIME, name: `${base}.docx` }
      : { body: toPlainText(text), type: "text/plain; charset=utf-8", name: `${base}.txt` };
    recordEvent(owner.key, "export", { generationId: id, doc, format, variant });
    if (format === "docx") serverEvent(owner, "export_docx", { doc });
    return { body: { ok: true } };
  });
  if (!file) return res;
  const f = file as { body: Uint8Array | string; type: string; name: string };
  const out = new NextResponse(f.body as BodyInit, { status: 200, headers: { "Content-Type": f.type, "Content-Disposition": `attachment; filename="${f.name}"`, "Cache-Control": "private, no-store" } });
  for (const c of res.cookies.getAll()) out.cookies.set(c);
  return out;
}
