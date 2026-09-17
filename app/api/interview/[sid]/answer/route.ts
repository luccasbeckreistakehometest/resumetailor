import { z } from "zod";
import { withOwner, bad, limited } from "@/lib/server/http";
import { runAi } from "@/lib/ai/guard";
import { scoreAnswer, summariseSession, type SessionSummary } from "@/lib/ai/interview";
import { getGeneration } from "@/lib/server/generations";
import { appendTurn, backgroundFor, finishSession, getSession, ownsSession, serialiseSession } from "@/lib/server/interviews";
import { nowIso } from "@/lib/server/db";
import { recordEvent } from "@/lib/server/onboarding";
import { lease, takeAll } from "@/lib/server/ratelimit";
import type { Lang } from "@/lib/ai/kit";
import type { Question, Turn } from "@/lib/interview/logic";

export const runtime = "nodejs";

const schema = z.object({ questionIdx: z.number().int().min(0), answer: z.string().min(3).max(4000), source: z.enum(["voice", "text"]).default("text") });

/**
 * Scores one answer and appends it. Answers must arrive in order, one per question, and one at a
 * time per session (a lease), so a double submit is neither scored nor stored twice. The last
 * answer also closes the session.
 */
export async function POST(request: Request, ctx: { params: Promise<{ sid: string }> }) {
  const { sid } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("answer_short");
    const row = getSession(sid);
    if (!row || !ownsSession(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    if (row.status !== "active") return bad("session_finished", 409);
    const questions = JSON.parse(row.questions) as Question[];
    const turns = JSON.parse(row.turns) as Turn[];
    if (parsed.data.questionIdx !== turns.length || !questions[turns.length]) return bad("answer_current_first", 409);
    const gen = getGeneration(row.generationId);
    if (!gen) return bad("not_found", 404);
    const over = takeAll([["INTERVIEW_IP_HOUR", owner.ip], ["INTERVIEW_OWNER_HOUR", owner.key]]);
    if (over) return limited(over);
    const slot = lease("INTERVIEW_ANSWER_INFLIGHT", row.id, 120);
    if (!slot.ok) return bad("answer_current_first", 409);
    try {
      const lang = row.lang as Lang;
      const { answer, source } = parsed.data;
      const scored = await runAi("interview_answer", { ownerKey: owner.key, ip: owner.ip }, () =>
        scoreAnswer({ question: questions[turns.length], answer, targetRole: gen.targetRole, background: backgroundFor(gen), lang }));
      if (!scored.ok) return scored.reply;
      const { result, costUsd } = scored.value;
      const turn: Turn = { questionIdx: turns.length, answer, source, scores: result.scores, coaching: result.coaching, modelAnswer: result.modelAnswer, at: nowIso() };
      let updated = appendTurn(row.id, turn, costUsd);
      if (!updated) return bad("answer_current_first", 409);
      if (turns.length + 1 >= questions.length) {
        const s = await runAi("interview_summary", { ownerKey: owner.key, ip: owner.ip }, () => summariseSession({ questions, turns: [...turns, turn], targetRole: gen.targetRole, lang }));
        // The answer is saved either way; a failed summary can be retried with "finish".
        if (!s.ok) return { body: serialiseSession(updated, { title: gen.title, targetRole: gen.targetRole }) };
        updated = finishSession(row.id, s.value.result as SessionSummary, s.value.costUsd);
        recordEvent(owner.key, "interview_done", { generationId: gen.id, answered: turns.length + 1 });
      }
      return { body: serialiseSession(updated, { title: gen.title, targetRole: gen.targetRole }) };
    } finally {
      slot.release();
    }
  });
}
