import { z } from "zod";
import { withOwner, bad } from "@/lib/server/http";
import { describeAiError } from "@/lib/ai/client";
import { scoreAnswer, summariseSession } from "@/lib/ai/interview";
import { getGeneration } from "@/lib/server/generations";
import { appendTurn, backgroundFor, finishSession, getSession, ownsSession, serialiseSession } from "@/lib/server/interviews";
import { nowIso } from "@/lib/server/db";
import { recordEvent } from "@/lib/server/onboarding";
import type { Lang } from "@/lib/ai/kit";
import type { Question, Turn } from "@/lib/interview/logic";

export const runtime = "nodejs";

const schema = z.object({ questionIdx: z.number().int().min(0), answer: z.string().min(3).max(4000), source: z.enum(["voice", "text"]).default("text") });

/**
 * Scores one answer and appends it. Answers must arrive in order, one per question, so a double
 * submit cannot score the same question twice. The last answer also closes the session.
 */
export async function POST(request: Request, ctx: { params: Promise<{ sid: string }> }) {
  const { sid } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("Say or type a little more.");
    const row = getSession(sid);
    if (!row || !ownsSession(row, owner.userId, owner.anonId)) return bad("Not found.", 404);
    if (row.status !== "active") return bad("This session is finished.", 409);
    const questions = JSON.parse(row.questions) as Question[];
    const turns = JSON.parse(row.turns) as Turn[];
    if (parsed.data.questionIdx !== turns.length || !questions[turns.length]) return bad("Answer the current question first.", 409);
    const gen = getGeneration(row.generationId);
    if (!gen) return bad("Not found.", 404);
    const lang = row.lang as Lang;
    try {
      const { result, costUsd } = await scoreAnswer({ question: questions[turns.length], answer: parsed.data.answer, targetRole: gen.targetRole, background: backgroundFor(gen), lang });
      const turn: Turn = { questionIdx: turns.length, answer: parsed.data.answer, source: parsed.data.source, scores: result.scores, coaching: result.coaching, modelAnswer: result.modelAnswer, at: nowIso() };
      let updated = appendTurn(row.id, turn, costUsd);
      if (turns.length + 1 >= questions.length) {
        const s = await summariseSession({ questions, turns: [...turns, turn], targetRole: gen.targetRole, lang });
        updated = finishSession(row.id, s.result, s.costUsd);
        recordEvent(owner.key, "interview_done", { generationId: gen.id, answered: turns.length + 1 });
      }
      return { body: serialiseSession(updated, { title: gen.title, targetRole: gen.targetRole }) };
    } catch (error) {
      console.error("interview answer", error);
      return bad(describeAiError(error), 502);
    }
  });
}
