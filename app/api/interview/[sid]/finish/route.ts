import { withOwner, bad, limited } from "@/lib/server/http";
import { runAi } from "@/lib/ai/guard";
import { summariseSession } from "@/lib/ai/interview";
import { getGeneration } from "@/lib/server/generations";
import { finishSession, getSession, ownsSession, serialiseSession } from "@/lib/server/interviews";
import { recordEvent } from "@/lib/server/onboarding";
import { takeAll } from "@/lib/server/ratelimit";
import type { Lang } from "@/lib/ai/kit";
import type { Question, Turn } from "@/lib/interview/logic";

export const runtime = "nodejs";

/** Ends a session early — after at least one answer — and writes the summary. */
export async function POST(_: Request, ctx: { params: Promise<{ sid: string }> }) {
  const { sid } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getSession(sid);
    if (!row || !ownsSession(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    const gen = getGeneration(row.generationId);
    if (!gen) return bad("not_found", 404);
    if (row.status === "done") return { body: serialiseSession(row, { title: gen.title, targetRole: gen.targetRole }) };
    const turns = JSON.parse(row.turns) as Turn[];
    if (!turns.length) return bad("answer_first", 409);
    const over = takeAll([["INTERVIEW_IP_HOUR", owner.ip], ["INTERVIEW_OWNER_HOUR", owner.key]]);
    if (over) return limited(over);
    const s = await runAi("interview_summary", { ownerKey: owner.key, ip: owner.ip }, () =>
      summariseSession({ questions: JSON.parse(row.questions) as Question[], turns, targetRole: gen.targetRole, lang: row.lang as Lang }));
    if (!s.ok) return s.reply;
    const updated = finishSession(row.id, s.value.result, s.value.costUsd);
    recordEvent(owner.key, "interview_done", { generationId: gen.id, answered: turns.length, early: true });
    return { body: serialiseSession(updated, { title: gen.title, targetRole: gen.targetRole }) };
  });
}
