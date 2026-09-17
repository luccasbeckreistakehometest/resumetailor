import { z } from "zod";
import { withOwner, bad, limited } from "@/lib/server/http";
import { EXTRACT_MODEL } from "@/lib/ai/client";
import { aiGate } from "@/lib/ai/guard";
import { getGeneration, ownsGeneration } from "@/lib/server/generations";
import { MAX_SESSIONS_PER_KIT, countSessionsForKit, createSession, listSessions, serialiseSession } from "@/lib/server/interviews";
import { recordEvent } from "@/lib/server/onboarding";
import { takeAll } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

/** The caller's practice sessions, optionally for one kit. Never anyone else's. */
export async function GET(request: Request) {
  const generationId = new URL(request.url).searchParams.get("generationId") ?? undefined;
  return withOwner(async (owner) => ({
    body: { items: listSessions(owner.userId, owner.anonId, generationId).map((r) => serialiseSession(r, { title: r.kitTitle, targetRole: r.targetRole })) },
  }));
}

const schema = z.object({ generationId: z.string().min(1).max(64) });

/** Opens a session on a kit the caller owns: the full interview when unlocked, a two-question preview otherwise. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("missing_fields");
    const gen = getGeneration(parsed.data.generationId);
    if (!gen || !ownsGeneration(gen, owner.userId, owner.anonId)) return bad("not_found", 404);
    const gate = aiGate({ ownerKey: owner.key, ip: owner.ip });
    if (gate) return gate;
    if (countSessionsForKit(gen.id, owner.userId, owner.anonId) >= MAX_SESSIONS_PER_KIT) return { body: { error: "limit" }, status: 429 };
    const over = takeAll([["INTERVIEW_IP_HOUR", owner.ip], ["INTERVIEW_OWNER_HOUR", owner.key]]);
    if (over) return limited(over);
    const row = createSession({ userId: owner.userId, anonId: owner.anonId, generation: gen, model: EXTRACT_MODEL });
    recordEvent(owner.key, "interview_start", { generationId: gen.id, mode: row.mode });
    return { body: serialiseSession(row, { title: gen.title, targetRole: gen.targetRole }) };
  });
}
