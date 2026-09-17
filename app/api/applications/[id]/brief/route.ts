import { createHash } from "node:crypto";
import { withOwner, bad } from "@/lib/server/http";
import { getApplication, ownsApplication, serialiseApplication } from "@/lib/server/applications";
import { getGeneration, kitInput, ownsGeneration } from "@/lib/server/generations";
import { listSessions, serialiseSession } from "@/lib/server/interviews";
import { buildTrend, toPoint } from "@/lib/interview/trend";
import { getDb } from "@/lib/server/db";
import { listVariants } from "@/lib/server/variants";
import type { Kit } from "@/lib/ai/kit";

/**
 * The interview-day brief: everything already made for this application, on one screen. No AI —
 * the kit's talking points and questions, cached company insights, the weakest practice dimension
 * and the pitch script if one exists. Owner only; a locked kit shows its free preview parts only.
 */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    const app = getApplication(id);
    if (!app || !ownsApplication(app, owner.userId, owner.anonId)) return bad("not_found", 404);
    const gen = app.generationId ? getGeneration(app.generationId) : null;
    if (!gen || !ownsGeneration(gen, owner.userId, owner.anonId)) return { body: { app: serialiseApplication(app), kit: null } };
    const kit = JSON.parse(gen.result) as Kit;
    const open = gen.unlocked === 1;
    const posting = kitInput(gen).jobDescription ?? "";
    let insights: unknown = null;
    if (posting) {
      const hash = createHash("sha256").update(posting.trim().toLowerCase().replace(/\s+/g, " ")).digest("hex");
      const row = getDb().prepare("SELECT result FROM insights_cache WHERE hash = ?").get(hash) as { result: string } | undefined;
      insights = row ? JSON.parse(row.result) : null;
    }
    const sessions = listSessions(owner.userId, owner.anonId, gen.id).map((s) => serialiseSession(s, { title: gen.title, targetRole: gen.targetRole }));
    const trend = buildTrend(sessions.map(toPoint));
    const pitch = open ? listVariants(gen.id).filter((v) => v.kind.startsWith("pitch:")).sort((a, b) => a.kind.localeCompare(b.kind))[0] ?? null : null;
    return {
      body: {
        app: serialiseApplication(app, gen.title),
        kit: {
          id: gen.id, title: gen.title, targetRole: gen.targetRole, unlocked: open, emphasis: kit.emphasis,
          talkingPoints: open ? kit.interviewPrep.talkingPoints.slice(0, 3) : [],
          questionsToAsk: open ? kit.interviewPrep.questionsToAsk : [],
          weakest: trend.sessions > 0 ? trend.weakest : null,
          pitch: pitch ? pitch.body : null,
          insights,
        },
      },
    };
  });
}
