import { getDb, newId, nowIso } from "@/lib/server/db";
import { milestonesFor, normaliseLink, todayIso, type Stage } from "@/lib/applications/logic";

export interface ApplicationRow {
  id: string; userId: string | null; anonId: string | null; generationId: string | null; company: string; role: string; link: string;
  stage: Stage; notes: string; nextStepAt: string | null; appliedAt: string | null; interviewAt: string | null; offerAt: string | null;
  rejectedAt: string | null; stageChangedAt: string; createdAt: string; updatedAt: string;
  interviewAtTime: string | null; contactName: string; contactChannel: string; contactValue: string; lastContactAt: string | null;
  followUps: number; offerType: string | null; offerAmount: number | null;
}
export type ApplicationWithKit = ApplicationRow & { kitTitle: string | null };

export interface ApplicationInput {
  company?: string; role?: string; link?: string; stage?: Stage; notes?: string; nextStepAt?: string | null; generationId?: string | null;
  interviewAtTime?: string | null; contactName?: string; contactChannel?: string; contactValue?: string;
  offerType?: "clt" | "pj" | null; offerAmount?: number | null; appliedAt?: string | null;
}

export function createApplication(owner: { userId: string | null; anonId: string | null }, input: ApplicationInput): ApplicationRow {
  const id = newId("app");
  const at = nowIso();
  const stage = input.stage ?? "saved";
  const m = milestonesFor(stage, { appliedAt: null, interviewAt: null, offerAt: null, rejectedAt: null }, todayIso());
  if (input.appliedAt && input.appliedAt <= todayIso() && m.appliedAt) m.appliedAt = input.appliedAt;
  getDb().prepare(`INSERT INTO applications (id,userId,anonId,generationId,company,role,link,stage,notes,nextStepAt,appliedAt,interviewAt,offerAt,rejectedAt,stageChangedAt,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, owner.userId, owner.userId ? null : owner.anonId, input.generationId ?? null, (input.company ?? "").trim().slice(0, 120), (input.role ?? "").trim().slice(0, 120),
    normaliseLink(input.link ?? "").slice(0, 500), stage, (input.notes ?? "").slice(0, 4000), input.nextStepAt ?? null,
    m.appliedAt, m.interviewAt, m.offerAt, m.rejectedAt, at, at, at,
  );
  const extra = { interviewAtTime: input.interviewAtTime, contactName: input.contactName, contactChannel: input.contactChannel, contactValue: input.contactValue, offerType: input.offerType, offerAmount: input.offerAmount };
  if (Object.values(extra).some((v) => v !== undefined && v !== null && v !== "")) return updateApplication(id, extra);
  return getApplication(id)!;
}

export function getApplication(id: string): ApplicationRow | null {
  return (getDb().prepare("SELECT * FROM applications WHERE id = ?").get(id) as ApplicationRow) ?? null;
}

export function ownsApplication(row: ApplicationRow, userId: string | null, anonId: string | undefined): boolean {
  if (userId && row.userId === userId) return true;
  return !!anonId && row.anonId === anonId && !row.userId;
}

export function listApplications(userId: string | null, anonId: string | undefined): ApplicationWithKit[] {
  const db = getDb();
  const base = "SELECT a.*, g.title kitTitle FROM applications a LEFT JOIN generations g ON g.id = a.generationId";
  if (userId) return db.prepare(`${base} WHERE a.userId = ? ORDER BY a.updatedAt DESC LIMIT 500`).all(userId) as ApplicationWithKit[];
  if (anonId) return db.prepare(`${base} WHERE a.anonId = ? AND a.userId IS NULL ORDER BY a.updatedAt DESC LIMIT 100`).all(anonId) as ApplicationWithKit[];
  return [];
}

/** Partial update. A stage change stamps the milestones it implies and never clears an earlier one. */
export function updateApplication(id: string, patch: ApplicationInput): ApplicationRow {
  const db = getDb();
  db.transaction(() => {
    const row = getApplication(id);
    if (!row) throw new Error("application not found");
    const next = { ...row };
    if (patch.company !== undefined) next.company = patch.company.trim().slice(0, 120);
    if (patch.role !== undefined) next.role = patch.role.trim().slice(0, 120);
    if (patch.link !== undefined) next.link = normaliseLink(patch.link).slice(0, 500);
    if (patch.notes !== undefined) next.notes = patch.notes.slice(0, 4000);
    if (patch.nextStepAt !== undefined) next.nextStepAt = patch.nextStepAt;
    if (patch.generationId !== undefined) next.generationId = patch.generationId;
    if (patch.interviewAtTime !== undefined) next.interviewAtTime = patch.interviewAtTime;
    if (patch.appliedAt && patch.appliedAt <= todayIso()) next.appliedAt = patch.appliedAt;
    if (patch.contactName !== undefined) next.contactName = patch.contactName.trim().slice(0, 120);
    if (patch.contactChannel !== undefined) next.contactChannel = patch.contactChannel;
    if (patch.contactValue !== undefined) next.contactValue = patch.contactValue.trim().slice(0, 200);
    if (patch.offerType !== undefined) next.offerType = patch.offerType;
    if (patch.offerAmount !== undefined) next.offerAmount = patch.offerAmount;
    const at = nowIso();
    if (patch.stage !== undefined && patch.stage !== row.stage) {
      Object.assign(next, milestonesFor(patch.stage, row, todayIso()));
      next.stage = patch.stage; next.stageChangedAt = at;
    }
    db.prepare(`UPDATE applications SET company=?, role=?, link=?, stage=?, notes=?, nextStepAt=?, generationId=?, appliedAt=?, interviewAt=?, offerAt=?, rejectedAt=?, stageChangedAt=?, updatedAt=?,
      interviewAtTime=?, contactName=?, contactChannel=?, contactValue=?, offerType=?, offerAmount=? WHERE id=?`)
      .run(next.company, next.role, next.link, next.stage, next.notes, next.nextStepAt, next.generationId, next.appliedAt, next.interviewAt, next.offerAt, next.rejectedAt, next.stageChangedAt, at,
        next.interviewAtTime, next.contactName, next.contactChannel, next.contactValue, next.offerType, next.offerAmount, id);
  })();
  return getApplication(id)!;
}

/** "I sent it": the radar alert goes away; follow-ups are counted so the radar knows when to stop nudging. */
export function markContacted(id: string, kind: string): ApplicationRow {
  getDb().prepare("UPDATE applications SET lastContactAt = ?, followUps = followUps + ?, updatedAt = ? WHERE id = ?")
    .run(nowIso(), kind === "followup" ? 1 : 0, nowIso(), id);
  return getApplication(id)!;
}

export function deleteApplication(id: string): void {
  getDb().prepare("DELETE FROM applications WHERE id = ?").run(id);
}

export function serialiseApplication(row: ApplicationRow, kitTitle: string | null = null) {
  return {
    id: row.id, generationId: row.generationId, kitTitle, company: row.company, role: row.role, link: row.link, stage: row.stage, notes: row.notes,
    nextStepAt: row.nextStepAt, appliedAt: row.appliedAt, interviewAt: row.interviewAt, offerAt: row.offerAt, rejectedAt: row.rejectedAt,
    stageChangedAt: row.stageChangedAt, createdAt: row.createdAt, updatedAt: row.updatedAt,
    interviewAtTime: row.interviewAtTime ?? null, contactName: row.contactName ?? "", contactChannel: row.contactChannel ?? "", contactValue: row.contactValue ?? "",
    lastContactAt: row.lastContactAt ?? null, followUps: row.followUps ?? 0, offerType: row.offerType ?? null, offerAmount: row.offerAmount ?? null,
  };
}
export type ApplicationView = ReturnType<typeof serialiseApplication>;
