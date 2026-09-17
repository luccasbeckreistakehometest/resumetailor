import { withOwner, bad } from "@/lib/server/http";
import { baseUrl } from "@/lib/server/env";
import { REFERRAL_CREDITS, refCodeFor, referralStats } from "@/lib/server/vouchers";

/** The account's share link and how many friends bought (credits are paid on their first purchase). */
export async function GET() {
  return withOwner(async (owner) => {
    if (!owner.userId) return bad("sign_in_required", 401);
    const code = refCodeFor(owner.userId);
    return { body: { code, link: `${baseUrl()}/r/${code}`, credits: REFERRAL_CREDITS(), ...referralStats(owner.userId) } };
  });
}
