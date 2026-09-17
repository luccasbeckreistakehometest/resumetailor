import { randomInt } from "node:crypto";
import { getDb, nowIso } from "@/lib/server/db";
import { envNumber } from "@/lib/server/env";
import { moveCredits } from "@/lib/server/users";

/**
 * Promo / partner codes and referrals. Codes add credits once per account, inside one immediate
 * transaction (so the last use of a code cannot be taken twice). Referrals pay only when the
 * referred account's FIRST purchase settles — never on signup — and only once.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // no I, O, 0, 1
export const randomCode = (len = 10) => Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const normaliseCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);

export interface VoucherRow { code: string; credits: number; maxRedemptions: number; redeemed: number; expiresAt: string | null; campaign: string; note: string; disabled: number; createdAt: string }
export type RedeemResult = { ok: true; credits: number; balance: number; campaign: string } | { ok: false; error: "not_found" | "expired" | "used" };

export function createVoucher(input: { code?: string; credits: number; maxRedemptions?: number; expiresAt?: string | null; campaign?: string; note?: string }): VoucherRow | null {
  const code = input.code ? normaliseCode(input.code) : randomCode();
  if (code.length < 4) return null;
  const res = getDb().prepare(`INSERT INTO vouchers (code, credits, maxRedemptions, redeemed, expiresAt, campaign, note, disabled, createdAt)
    VALUES (?,?,?,0,?,?,?,0,?) ON CONFLICT(code) DO NOTHING`).run(
    code, Math.max(1, Math.min(50, Math.round(input.credits))), Math.max(1, Math.min(100_000, Math.round(input.maxRedemptions ?? 1))),
    input.expiresAt ?? null, (input.campaign ?? "").trim().toLowerCase().slice(0, 60), (input.note ?? "").slice(0, 200), nowIso(),
  );
  return res.changes ? getVoucher(code) : null;
}

/** N single-use codes for one partner (a CSV is built from the result). */
export function createBatch(input: { count: number; credits: number; campaign: string; note?: string; expiresAt?: string | null }): VoucherRow[] {
  const db = getDb();
  const out: VoucherRow[] = [];
  db.transaction(() => {
    let guard = 0;
    while (out.length < Math.min(500, input.count) && guard++ < input.count * 5) {
      const v = createVoucher({ credits: input.credits, maxRedemptions: 1, campaign: input.campaign, note: input.note, expiresAt: input.expiresAt });
      if (v) out.push(v);
    }
  }).immediate();
  return out;
}

export function getVoucher(code: string): VoucherRow | null {
  return (getDb().prepare("SELECT * FROM vouchers WHERE code = ?").get(normaliseCode(code)) as VoucherRow) ?? null;
}

export function redeemVoucher(rawCode: string, userId: string, now = Date.now()): RedeemResult {
  const db = getDb();
  const code = normaliseCode(rawCode);
  return db.transaction((): RedeemResult => {
    const v = db.prepare("SELECT * FROM vouchers WHERE code = ?").get(code) as VoucherRow | undefined;
    if (!v) return { ok: false, error: "not_found" };
    if (v.disabled || (v.expiresAt && Date.parse(v.expiresAt) < now)) return { ok: false, error: "expired" };
    if (v.redeemed >= v.maxRedemptions) return { ok: false, error: "used" };
    if (db.prepare("SELECT 1 FROM voucher_redemptions WHERE code = ? AND userId = ?").get(code, userId)) return { ok: false, error: "used" };
    db.prepare("INSERT INTO voucher_redemptions (code, userId, createdAt) VALUES (?,?,?)").run(code, userId, nowIso());
    db.prepare("UPDATE vouchers SET redeemed = redeemed + 1 WHERE code = ?").run(code);
    const balance = moveCredits(userId, v.credits, "voucher", code);
    return { ok: true, credits: v.credits, balance, campaign: v.campaign };
  }).immediate();
}

export function setVoucherDisabled(code: string, disabled: boolean): VoucherRow | null {
  getDb().prepare("UPDATE vouchers SET disabled = ? WHERE code = ?").run(disabled ? 1 : 0, normaliseCode(code));
  return getVoucher(code);
}

export function listVouchers(limit = 300) {
  return getDb().prepare("SELECT * FROM vouchers ORDER BY createdAt DESC LIMIT ?").all(limit) as VoucherRow[];
}
export function listRedemptions(limit = 200) {
  return getDb().prepare(`SELECT r.code, r.createdAt, u.email, v.campaign, v.credits FROM voucher_redemptions r
    JOIN vouchers v ON v.code = r.code LEFT JOIN users u ON u.id = r.userId ORDER BY r.createdAt DESC LIMIT ?`).all(limit) as { code: string; createdAt: string; email: string | null; campaign: string; credits: number }[];
}

/* ---------- referrals ---------- */

export const REFERRAL_CREDITS = () => envNumber("REFERRAL_CREDITS", 1);
export const REF_COOKIE = "rt_ref";

/** The account's share code, created the first time it is asked for. */
export function refCodeFor(userId: string): string {
  const db = getDb();
  const cur = db.prepare("SELECT refCode FROM users WHERE id = ?").get(userId) as { refCode: string | null } | undefined;
  if (cur?.refCode) return cur.refCode;
  for (let i = 0; i < 10; i++) {
    const code = randomCode(8);
    try {
      const res = db.prepare("UPDATE users SET refCode = ? WHERE id = ? AND refCode IS NULL").run(code, userId);
      if (res.changes) return code;
      const again = db.prepare("SELECT refCode FROM users WHERE id = ?").get(userId) as { refCode: string | null };
      if (again.refCode) return again.refCode;
    } catch { /* unique clash: try another */ }
  }
  throw new Error("could not allocate a referral code");
}

export function userByRefCode(code: string): string | null {
  const row = getDb().prepare("SELECT id FROM users WHERE refCode = ?").get(normaliseCode(code)) as { id: string } | undefined;
  return row?.id ?? null;
}

/** At signup: a pending referral, no credits. Self-referral and a second referrer are ignored. */
export function recordReferral(referrerId: string | null, referredId: string): boolean {
  if (!referrerId || referrerId === referredId) return false;
  return getDb().prepare("INSERT OR IGNORE INTO referrals (referrerId, referredId, status, createdAt) VALUES (?,?,'pending',?)").run(referrerId, referredId, nowIso()).changes === 1;
}

/**
 * Called inside settlePayment's transaction when a purchase is granted: on the referred account's
 * first approved payment, both sides get REFERRAL_CREDITS and the referral is closed.
 */
export function rewardReferralOnPurchase(referredId: string): boolean {
  const db = getDb();
  const ref = db.prepare("SELECT * FROM referrals WHERE referredId = ? AND status = 'pending'").get(referredId) as { id: number; referrerId: string } | undefined;
  if (!ref) return false;
  const paid = (db.prepare("SELECT COUNT(*) n FROM payments WHERE userId = ? AND status IN ('approved','partially_refunded','refunded','charged_back')").get(referredId) as { n: number }).n;
  if (paid !== 1) return false;
  const closed = db.prepare("UPDATE referrals SET status = 'rewarded', rewardedAt = ? WHERE id = ? AND status = 'pending'").run(nowIso(), ref.id);
  if (!closed.changes) return false;
  const credits = REFERRAL_CREDITS();
  moveCredits(referredId, credits, "referral_bonus", `ref:${ref.id}`);
  if (db.prepare("SELECT 1 FROM users WHERE id = ?").get(ref.referrerId)) moveCredits(ref.referrerId, credits, "referral_bonus", `ref:${ref.id}`);
  return true;
}

export function referralStats(userId: string) {
  const row = getDb().prepare("SELECT SUM(status = 'pending') pending, SUM(status = 'rewarded') rewarded FROM referrals WHERE referrerId = ?").get(userId) as { pending: number | null; rewarded: number | null };
  return { pending: row.pending ?? 0, rewarded: row.rewarded ?? 0, creditsEarned: (row.rewarded ?? 0) * REFERRAL_CREDITS() };
}
