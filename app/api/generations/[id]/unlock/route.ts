import { withOwner, bad } from "@/lib/server/http";
import { getGeneration, serialise, unlockGeneration } from "@/lib/server/generations";
import { recordEvent } from "@/lib/server/onboarding";
import { serverEvent } from "@/lib/server/analytics";

/** Spends one credit. The kit stays a preview for anonymous visitors: an account is what holds credits. */
export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    if (!owner.userId) return bad("account_required", 401);
    const result = unlockGeneration(id, owner.userId);
    if (!result.ok) {
      if (result.reason === "insufficient") return { body: { error: "no_credits" }, status: 402 };
      if (result.reason === "already") return { body: serialise(getGeneration(id)!) };
      return bad("not_found", 404);
    }
    recordEvent(owner.userId, "unlock", { generationId: id });
    serverEvent(owner, "unlock");
    return { body: { ...serialise(getGeneration(id)!), credits: result.credits } };
  });
}
