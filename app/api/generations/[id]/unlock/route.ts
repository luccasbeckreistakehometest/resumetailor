import { withOwner, bad } from "@/lib/server/http";
import { getGeneration, serialise, unlockGeneration } from "@/lib/server/generations";
import { recordEvent } from "@/lib/server/onboarding";

/** Spends one credit. The kit stays a preview for anonymous visitors: an account is what holds credits. */
export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    if (!owner.userId) return bad("Create a free account to unlock — your first kit is on us.", 401);
    const result = unlockGeneration(id, owner.userId);
    if (!result.ok) {
      if (result.reason === "insufficient") return { body: { error: "no_credits" }, status: 402 };
      if (result.reason === "already") return { body: serialise(getGeneration(id)!) };
      return bad("Not found.", 404);
    }
    recordEvent(owner.userId, "unlock", { generationId: id });
    return { body: { ...serialise(getGeneration(id)!), credits: result.credits } };
  });
}
