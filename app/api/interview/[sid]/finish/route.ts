import { withOwner, bad } from "@/lib/server/http";
import { describeAiError } from "@/lib/ai/client";
import { summariseSession } from "@/lib/ai/interview";
import { getGeneration } from "@/lib/server/generations";
import { finishSession, getSession, ownsSession, serialiseSession } from "@/lib/server/interviews";
import { recordEvent } from "@/lib/server/onboarding";
import type { Lang } from "@/lib/ai/kit";
import type { Question, Turn } from "@/lib/interview/logic";

export const runtime = "nodejs";

/** Ends a session early — after at least one answer — and writes the summary. */
export async function POST(_: Request, ctx: { params: Promise<{ sid: string }> }) {
  const { sid } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getSession(sid);
    if (!row || !ownsSession(row, owner.userId, owner.anonId)) return bad("Not found.", 404);
    const gen = getGeneration(row.generationId);
    if (!gen) return bad("Not found.", 404);
    if (row.status === "done") return { body: serialiseSession(row, { title: gen.title, targetRole: gen.targetRole }) };
    const turns = JSON.parse(row.turns) as Turn[];
    if (!turns.length) return bad("Answer at least one question first.", 409);
    try {
      const s = await summariseSession({ questions: JSON.parse(row.questions) as Question[], turns, targetRole: gen.targetRole, lang: row.lang as Lang });
      const updated = finishSession(row.id, s.result, s.costUsd);
      recordEvent(owner.key, "interview_done", { generationId: gen.id, answered: turns.length, early: true });
      return { body: serialiseSession(updated, { title: gen.title, targetRole: gen.targetRole }) };
    } catch (error) {
      console.error("interview finish", error);
      return bad(describeAiError(error), 502);
    }
  });
}
