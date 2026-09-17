import { withOwner, bad } from "@/lib/server/http";
import { getGeneration, kitInput, serialise, unlockGeneration } from "@/lib/server/generations";
import { getProfile, saveProfile } from "@/lib/server/profiles";
import type { Kit } from "@/lib/ai/kit";
import { recordEvent } from "@/lib/server/onboarding";
import { serverEvent } from "@/lib/server/analytics";

/**
 * Spends one credit. The kit stays a preview for anonymous visitors: an account is what holds
 * credits. A résumé built from scratch (and "remember" left on) becomes the saved base résumé once
 * it is unlocked — never before, since a locked preview must not leak through the profile — unless
 * the account already has one.
 */
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
    const row = getGeneration(id)!;
    if (row.mode === "build" && kitInput(row).remember && !getProfile(owner.userId)?.resume) {
      saveProfile(owner.userId, { resume: (JSON.parse(row.result) as Kit).resume, role: row.targetRole });
    }
    recordEvent(owner.userId, "unlock", { generationId: id });
    serverEvent(owner, "unlock");
    return { body: { ...serialise(row), credits: result.credits } };
  });
}
