import { getDb, newId, nowIso } from "@/lib/server/db";
import type { GenerationRow } from "@/lib/server/generations";
import type { Kit, Lang } from "@/lib/ai/kit";
import { aggregate, buildQuestions, type Question, type Turn } from "@/lib/interview/logic";
import type { SessionSummary } from "@/lib/ai/interview";

export interface SessionRow {
  id: string; userId: string | null; anonId: string | null; generationId: string; lang: string; mode: "full" | "preview";
  status: "active" | "done"; questions: string; turns: string; summary: string | null; model: string; costUsd: number;
  createdAt: string; completedAt: string | null;
}

/** Every answer is an AI call, so practice on one kit is bounded. Override per deployment. */
export const MAX_SESSIONS_PER_KIT = Number(process.env.INTERVIEW_MAX_SESSIONS_PER_KIT ?? 5);

export function createSession(input: { userId: string | null; anonId: string | null; generation: GenerationRow; model: string }): SessionRow {
  const kit = JSON.parse(input.generation.result) as Kit;
  const preview = input.generation.unlocked !== 1;
  const lang = (["en", "pt", "es"].includes(input.generation.lang) ? input.generation.lang : "en") as Lang;
  const questions = buildQuestions(kit, input.generation.targetRole, lang, preview);
  const id = newId("int");
  getDb().prepare(`INSERT INTO interview_sessions (id,userId,anonId,generationId,lang,mode,status,questions,turns,model,costUsd,createdAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, input.userId, input.userId ? null : input.anonId, input.generation.id, lang, preview ? "preview" : "full", "active",
    JSON.stringify(questions), "[]", input.model, 0, nowIso(),
  );
  return getSession(id)!;
}

export function getSession(id: string): SessionRow | null {
  return (getDb().prepare("SELECT * FROM interview_sessions WHERE id = ?").get(id) as SessionRow) ?? null;
}

export function ownsSession(row: SessionRow, userId: string | null, anonId: string | undefined): boolean {
  if (userId && row.userId === userId) return true;
  return !!anonId && row.anonId === anonId && !row.userId;
}

export function countSessionsForKit(generationId: string, userId: string | null, anonId: string | undefined): number {
  const db = getDb();
  if (userId) return (db.prepare("SELECT COUNT(*) n FROM interview_sessions WHERE generationId = ? AND userId = ?").get(generationId, userId) as { n: number }).n;
  if (anonId) return (db.prepare("SELECT COUNT(*) n FROM interview_sessions WHERE generationId = ? AND anonId = ? AND userId IS NULL").get(generationId, anonId) as { n: number }).n;
  return 0;
}

export type SessionWithKit = SessionRow & { kitTitle: string; targetRole: string };

export function listSessions(userId: string | null, anonId: string | undefined, generationId?: string): SessionWithKit[] {
  const db = getDb();
  const base = "SELECT s.*, g.title kitTitle, g.targetRole targetRole FROM interview_sessions s JOIN generations g ON g.id = s.generationId";
  const gen = generationId ? " AND s.generationId = ?" : "";
  if (userId) return db.prepare(`${base} WHERE s.userId = ?${gen} ORDER BY s.createdAt DESC LIMIT 100`).all(...(generationId ? [userId, generationId] : [userId])) as SessionWithKit[];
  if (anonId) return db.prepare(`${base} WHERE s.anonId = ? AND s.userId IS NULL${gen} ORDER BY s.createdAt DESC LIMIT 20`).all(...(generationId ? [anonId, generationId] : [anonId])) as SessionWithKit[];
  return [];
}

export function appendTurn(id: string, turn: Turn, costUsd: number): SessionRow {
  const db = getDb();
  db.transaction(() => {
    const row = getSession(id);
    if (!row) throw new Error("session not found");
    const turns = JSON.parse(row.turns) as Turn[];
    turns.push(turn);
    db.prepare("UPDATE interview_sessions SET turns = ?, costUsd = costUsd + ? WHERE id = ?").run(JSON.stringify(turns), costUsd, id);
  })();
  return getSession(id)!;
}

export function finishSession(id: string, summary: SessionSummary, costUsd: number): SessionRow {
  getDb().prepare("UPDATE interview_sessions SET status = 'done', summary = ?, completedAt = COALESCE(completedAt, ?), costUsd = costUsd + ? WHERE id = ?")
    .run(JSON.stringify(summary), nowIso(), costUsd, id);
  return getSession(id)!;
}

/** What the candidate's own background looks like to the coach: real facts only, never the posting. */
export function backgroundFor(generation: GenerationRow): string {
  const kit = JSON.parse(generation.result) as Kit;
  return [`Target role: ${generation.targetRole}`, `Emphasise: ${kit.emphasis.join("; ")}`, `Talking points: ${kit.interviewPrep.talkingPoints.join("; ")}`, "", kit.resume.slice(0, 3000)].join("\n");
}

export function serialiseSession(row: SessionRow, kit?: { title: string; targetRole: string }) {
  const questions = JSON.parse(row.questions) as Question[];
  const turns = JSON.parse(row.turns) as Turn[];
  return {
    id: row.id, generationId: row.generationId, lang: row.lang as Lang, mode: row.mode, status: row.status,
    kitTitle: kit?.title ?? "", targetRole: kit?.targetRole ?? "",
    questions, turns, summary: row.summary ? (JSON.parse(row.summary) as SessionSummary) : null,
    aggregate: aggregate(turns), createdAt: row.createdAt, completedAt: row.completedAt,
  };
}
export type SessionView = ReturnType<typeof serialiseSession>;
