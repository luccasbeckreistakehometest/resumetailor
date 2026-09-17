import { NextResponse } from "next/server";
import { ownerKey } from "@/lib/server/session";
import { getApplication, ownsApplication } from "@/lib/server/applications";
import { buildIcs } from "@/lib/applications/ics";
import { FOLLOW_UP_AFTER_DAYS } from "@/lib/applications/radar";
import { baseUrl } from "@/lib/server/env";
import { jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

const COPY = {
  en: { interview: (c: string) => `Interview: ${c}`, followup: (c: string) => `Follow up: ${c}`, brief: "Interview-day brief", tracker: "Your applications" },
  pt: { interview: (c: string) => `Entrevista: ${c}`, followup: (c: string) => `Follow-up: ${c}`, brief: "Folha do dia da entrevista", tracker: "Suas candidaturas" },
  es: { interview: (c: string) => `Entrevista: ${c}`, followup: (c: string) => `Seguimiento: ${c}`, brief: "Hoja del día de la entrevista", tracker: "Tus postulaciones" },
};

/** GET ?kind=interview|followup&lang= — a calendar file with reminders one day and one hour before. Owner only. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "followup" ? "followup" : "interview";
  const langParam = url.searchParams.get("lang");
  const lang = langParam === "pt" || langParam === "es" ? langParam : "en";
  const owner = await ownerKey();
  const row = getApplication(id);
  if (!row || !ownsApplication(row, owner.userId, owner.anonId)) return jsonError("not_found", 404);
  const c = COPY[lang];
  const who = [row.company, row.role].filter(Boolean).join(" — ") || "ResumeTailor";
  const base = baseUrl();
  let body: string;
  if (kind === "interview") {
    if (!row.interviewAtTime) return jsonError("check_fields", 409);
    body = buildIcs({ uid: `${row.id}-interview@resumetailor`, summary: c.interview(who), description: `${c.brief}: ${base}/brief/${row.id}`, url: `${base}/brief/${row.id}`, start: new Date(row.interviewAtTime) });
  } else {
    const from = (row.lastContactAt ?? row.appliedAt ?? row.createdAt).slice(0, 10);
    const due = new Date(Date.parse(`${from}T12:00:00Z`) + FOLLOW_UP_AFTER_DAYS * 86_400_000).toISOString().slice(0, 10);
    body = buildIcs({ uid: `${row.id}-followup@resumetailor`, summary: c.followup(who), description: `${c.tracker}: ${base}/applications`, url: `${base}/applications`, start: due });
  }
  return new NextResponse(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${kind}-${row.id}.ics"`, "Cache-Control": "private, no-store" } });
}
