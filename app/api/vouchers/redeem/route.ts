import { z } from "zod";
import { withOwner, bad, limited } from "@/lib/server/http";
import { takeAll } from "@/lib/server/ratelimit";
import { redeemVoucher } from "@/lib/server/vouchers";
import { serverEvent } from "@/lib/server/analytics";

const schema = z.object({ code: z.string().min(3).max(40) });
const ERRORS = { not_found: ["voucher_not_found", 404], expired: ["voucher_expired", 410], used: ["voucher_used", 409] } as const;

/** Redeems a promo / partner code for the signed-in account. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!owner.userId) return bad("sign_in_required", 401);
    if (!parsed.success) return bad("voucher_not_found", 404);
    const over = takeAll([["VOUCHER_USER_HOUR", owner.userId], ["VOUCHER_IP_HOUR", owner.ip]]);
    if (over) return limited(over);
    const res = redeemVoucher(parsed.data.code, owner.userId);
    if (!res.ok) { const [code, status] = ERRORS[res.error]; return bad(code, status); }
    serverEvent(owner, "voucher_redeem", { campaign: res.campaign || "(none)", credits: res.credits });
    return { body: { ok: true, credits: res.credits, balance: res.balance } };
  });
}
