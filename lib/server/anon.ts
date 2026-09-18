import { getDb } from "@/lib/server/db";

/**
 * Does this anonymous id own anything? Used to decide whether an *unsigned* rt_anon cookie — one
 * handed out before the cookie was signed — is a returning visitor worth keeping, or a value
 * somebody made up. A real visitor has a kit, an application, a profile or an onboarding row
 * against their id; an invented one has nothing, and gets a freshly minted (signed) id instead.
 *
 * This is the whole grandfathering window: once a legacy visitor comes back they are re-issued a
 * signed cookie, so the unsigned branch dies out on its own.
 */
export function anonHasWork(id: string): boolean {
  if (!id) return false;
  const row = getDb().prepare(`SELECT
      EXISTS(SELECT 1 FROM generations WHERE anonId = ?1)
      + EXISTS(SELECT 1 FROM applications WHERE anonId = ?1)
      + EXISTS(SELECT 1 FROM career_profiles WHERE ownerKey = ?1)
      + EXISTS(SELECT 1 FROM onboarding WHERE id = ?1) AS n`).get(id) as { n: number };
  return row.n > 0;
}
