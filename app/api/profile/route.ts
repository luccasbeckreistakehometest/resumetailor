import { z } from "zod";
import { withOwner, bad } from "@/lib/server/http";
import { PROFILE_RESUME_MAX, deleteProfile, getProfile, saveProfile } from "@/lib/server/profiles";
import { parseFacts } from "@/lib/profile/facts";

export const runtime = "nodejs";

/** The caller's saved base résumé and facts. The owner comes from the cookie only — never from the request. */
export async function GET() {
  return withOwner(async (owner) => ({ body: { profile: owner.isNewAnon ? null : getProfile(owner.key) } }));
}

const schema = z.object({
  resume: z.string().max(PROFILE_RESUME_MAX).optional(),
  facts: z.unknown().optional(),
  replaceFacts: z.boolean().optional(),
});

export async function PUT(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("check_fields");
    if (owner.isNewAnon) return bad("forbidden", 403);
    const { resume, facts, replaceFacts } = parsed.data;
    const profile = saveProfile(owner.key, { resume, facts: facts === undefined ? undefined : parseFacts(facts), replaceFacts });
    return { body: { profile } };
  });
}

export async function DELETE() {
  return withOwner(async (owner) => {
    deleteProfile(owner.key);
    return { body: { ok: true } };
  });
}
