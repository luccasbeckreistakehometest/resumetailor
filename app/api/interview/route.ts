import { z } from "zod";
import { withOwner, bad } from "@/lib/server/http";
import { aiConfigured } from "@/lib/ai/client";
import { EXTRACT_MODEL } from "@/lib/ai/client";
import { getGeneration, ownsGeneration } from "@/lib/server/generations";
import { MAX_SESSIONS_PER_KIT, countSessionsForKit, createSession, listSessions, serialiseSession } from "@/lib/server/interviews";
import { recordEvent } from "@/lib/server/onboarding";

export const runtime = "nodejs";

/** The caller's practice sessions, optionally for one kit. Never anyone else's. */
export async function GET(request: Request) {
  const generationId = new URL(request.url).searchParams.get("generationId") ?? undefined;
  return withOwner(async (owner) => ({
    body: { items: listSessions(owner.userId, owner.anonId, generationId).map((r) => serialiseSession(r, { title: r.kitTitle, targetRole: r.targetRole })) },
  }));
}

const schema = z.object({ generationId: z.string().min(1) });

/** Opens a session on a kit the caller owns: the full interview when unlocked, a two-question preview otherwise. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("Missing kit.");
    const gen = getGeneration(parsed.data.generationId);
    if (!gen || !ownsGeneration(gen, owner.userId, owner.anonId)) return bad("Not found.", 404);
    if (!aiConfigured()) return bad("The AI service is not configured yet.", 503);
    if (countSessionsForKit(gen.id, owner.userId, owner.anonId) >= MAX_SESSIONS_PER_KIT) return { body: { error: "limit" }, status: 429 };
    const row = createSession({ userId: owner.userId, anonId: owner.anonId, generation: gen, model: EXTRACT_MODEL });
    recordEvent(owner.key, "interview_start", { generationId: gen.id, mode: row.mode });
    return { body: serialiseSession(row, { title: gen.title, targetRole: gen.targetRole }) };
  });
}
