import { z } from "zod";
import { withOwner, bad } from "@/lib/server/http";
import { STAGES, funnel, isIsoDate } from "@/lib/applications/logic";
import { createApplication, listApplications, serialiseApplication } from "@/lib/server/applications";
import { getGeneration, ownsGeneration } from "@/lib/server/generations";
import { recordEvent } from "@/lib/server/onboarding";
import { serverEvent } from "@/lib/server/analytics";
import { radar } from "@/lib/applications/radar";
import { getVariant } from "@/lib/server/variants";

/** Body shape shared by create and update. `nextStepAt` is a calendar date, not a timestamp. */
export const applicationSchema = z.object({
  company: z.string().max(120).optional(),
  role: z.string().max(120).optional(),
  link: z.string().max(500).optional(),
  stage: z.enum(STAGES).optional(),
  notes: z.string().max(4000).optional(),
  nextStepAt: z.string().nullable().optional().refine((v) => v == null || v === "" || isIsoDate(v), "date"),
  generationId: z.string().nullable().optional(),
  interviewAtTime: z.string().max(40).nullable().optional().refine((v) => v == null || v === "" || !Number.isNaN(Date.parse(v)), "datetime"),
  contactName: z.string().max(120).optional(),
  contactChannel: z.enum(["", "email", "whatsapp", "linkedin", "other"]).optional(),
  contactValue: z.string().max(200).optional(),
  offerType: z.enum(["clt", "pj"]).nullable().optional(),
  offerAmount: z.number().min(0).max(10_000_000).nullable().optional(),
  /** "I applied last week": a past date the person sets themselves. */
  appliedAt: z.string().nullable().optional().refine((v) => v == null || v === "" || isIsoDate(v), "date"),
});

export async function GET() {
  return withOwner(async (owner) => {
    const rows = listApplications(owner.userId, owner.anonId);
    const alerts = radar(rows, Date.now()).map((al) => {
      const app = rows.find((r) => r.id === al.appId)!;
      // The kit's own recruiter e-mail when it was already written; otherwise the page uses a template.
      const kind = al.kind === "followup" ? "email:nudge" : al.kind === "thanks" ? "email:thanks" : null;
      const v = kind && app.generationId ? getVariant(app.generationId, kind) : null;
      return { ...al, message: v ? { subject: v.subject, body: v.body } : null };
    });
    return { body: { items: rows.map((r) => serialiseApplication(r, r.kitTitle)), funnel: funnel(rows), radar: alerts } };
  });
}

export async function POST(request: Request) {
  const parsed = applicationSchema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("check_fields");
    const b = parsed.data;
    if (!(b.company ?? "").trim() && !(b.role ?? "").trim()) return bad("need_company_or_role");
    // A linked kit has to be the caller's own; a stranger's id is treated as no kit at all.
    let generationId: string | null = null;
    if (b.generationId) { const g = getGeneration(b.generationId); if (g && ownsGeneration(g, owner.userId, owner.anonId)) generationId = g.id; }
    const row = createApplication({ userId: owner.userId, anonId: owner.anonId }, {
      ...b, nextStepAt: b.nextStepAt || null, generationId, appliedAt: b.appliedAt || null,
      interviewAtTime: b.interviewAtTime ? new Date(b.interviewAtTime).toISOString() : null,
    });
    serverEvent(owner, "application_add", { stage: row.stage });
    recordEvent(owner.key, "application_add", { stage: row.stage, withKit: !!generationId });
    const rows = listApplications(owner.userId, owner.anonId);
    return { body: { item: serialiseApplication(row, rows.find((r) => r.id === row.id)?.kitTitle ?? null), funnel: funnel(rows) } };
  });
}
