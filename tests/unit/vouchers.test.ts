import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "data", "unit-vouchers");
process.env.DATA_DIR = DIR;
process.env.REFERRAL_CREDITS = "1";
fs.rmSync(DIR, { recursive: true, force: true });

const { createUser, findById } = await import("@/lib/server/users");
const { settlePayment, reversePayment } = await import("@/lib/server/payments");
const { createBatch, createVoucher, recordReferral, redeemVoucher, refCodeFor, userByRefCode, setVoucherDisabled } = await import("@/lib/server/vouchers");
const { getDb } = await import("@/lib/server/db");

let n = 0;
const user = () => createUser({ email: `v${++n}@example.com`, password: "password123", bonus: false });
const ledger = (id: string, reason: string) => (getDb().prepare("SELECT COUNT(*) c FROM credit_ledger WHERE userId = ? AND reason = ?").get(id, reason) as { c: number }).c;

describe("vouchers", () => {
  it("a 2-credit single-use code credits A once; B and A again get 'used'", async () => {
    const a = await user(), b = await user();
    createVoucher({ code: "uni-2026", credits: 2, maxRedemptions: 1, campaign: "USP" });
    expect(redeemVoucher("UNI-2026", a.id)).toMatchObject({ ok: true, credits: 2, balance: 2, campaign: "usp" });
    expect(ledger(a.id, "voucher")).toBe(1);
    expect(redeemVoucher("uni-2026", b.id)).toEqual({ ok: false, error: "used" });
    expect(redeemVoucher("uni-2026", a.id)).toEqual({ ok: false, error: "used" });
    expect(findById(b.id)!.credits).toBe(0);
  });

  it("unknown → not_found; expired or disabled → expired; a multi-use code serves each account once", async () => {
    const a = await user(), b = await user();
    expect(redeemVoucher("NOPE", a.id)).toEqual({ ok: false, error: "not_found" });
    createVoucher({ code: "OLD1", credits: 1, expiresAt: "2020-01-01T00:00:00Z" });
    expect(redeemVoucher("OLD1", a.id)).toEqual({ ok: false, error: "expired" });
    createVoucher({ code: "OFF1", credits: 1 });
    setVoucherDisabled("OFF1", true);
    expect(redeemVoucher("OFF1", a.id)).toEqual({ ok: false, error: "expired" });
    createVoucher({ code: "BOOT10", credits: 1, maxRedemptions: 10 });
    expect(redeemVoucher("BOOT10", a.id).ok).toBe(true);
    expect(redeemVoucher("BOOT10", b.id).ok).toBe(true);
    expect(redeemVoucher("BOOT10", a.id).ok).toBe(false);
  });

  it("the last use is taken exactly once, even in a burst", async () => {
    const users = await Promise.all(Array.from({ length: 8 }, () => user()));
    createVoucher({ code: "LAST1", credits: 1, maxRedemptions: 1 });
    const results = await Promise.all(users.map(async (u) => redeemVoucher("LAST1", u.id)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("batches are unique single-use codes without ambiguous characters", () => {
    const codes = createBatch({ count: 25, credits: 1, campaign: "bootcamp-x" }).map((v) => v.code);
    expect(new Set(codes).size).toBe(25);
    for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
  });
});

describe("referrals", () => {
  it("nothing at signup; both sides +1 when the referred account's first purchase settles; never again", async () => {
    const a = await user(), b = await user();
    const code = refCodeFor(a.id);
    expect(refCodeFor(a.id)).toBe(code);
    expect(userByRefCode(code)).toBe(a.id);
    expect(recordReferral(a.id, b.id)).toBe(true);
    expect(recordReferral(a.id, b.id)).toBe(false);
    expect(findById(a.id)!.credits).toBe(0);
    expect(findById(b.id)!.credits).toBe(0);

    const pay = { provider: "mercadopago" as const, externalId: "ref-pay-1", userId: b.id, pack: "1", credits: 1, amount: 39, currency: "BRL", status: "approved" as const };
    expect(settlePayment(pay).granted).toBe(true);
    expect(findById(b.id)!.credits).toBe(2);   // 1 bought + 1 referral bonus
    expect(findById(a.id)!.credits).toBe(1);
    // A replayed webhook grants nothing; a second purchase pays no referral.
    expect(settlePayment(pay).granted).toBe(false);
    settlePayment({ ...pay, externalId: "ref-pay-2" });
    expect(findById(a.id)!.credits).toBe(1);
    expect(ledger(b.id, "referral_bonus")).toBe(1);
  });

  it("a refund or chargeback of the qualifying purchase takes the reward back from both sides, once", async () => {
    const a = await user(), b = await user();
    recordReferral(a.id, b.id);
    const pay = { provider: "mercadopago" as const, externalId: "ref-refund-1", userId: b.id, pack: "1", credits: 1, amount: 39, currency: "BRL", status: "approved" as const };
    settlePayment(pay);
    expect([findById(a.id)!.credits, findById(b.id)!.credits]).toEqual([1, 2]);
    expect(reversePayment({ provider: "mercadopago", externalId: "ref-refund-1", status: "refunded" }).taken).toBe(1);
    expect([findById(a.id)!.credits, findById(b.id)!.credits]).toEqual([0, 0]);
    expect((getDb().prepare("SELECT status FROM referrals WHERE referredId = ?").get(b.id) as { status: string }).status).toBe("reversed");
    // A replayed refund notification takes nothing more.
    reversePayment({ provider: "mercadopago", externalId: "ref-refund-1", status: "refunded" });
    expect(ledger(a.id, "referral_reversed") + ledger(b.id, "referral_reversed")).toBe(2);
    // A later purchase does not pay the referral again.
    settlePayment({ ...pay, externalId: "ref-refund-2" });
    expect([findById(a.id)!.credits, findById(b.id)!.credits]).toEqual([0, 1]);

    // A reward already spent cannot be taken below zero; a chargeback of the purchase still closes it.
    const c = await user(), d = await user();
    recordReferral(c.id, d.id);
    settlePayment({ ...pay, externalId: "ref-cb-1", userId: d.id });
    getDb().prepare("UPDATE users SET credits = 0 WHERE id = ?").run(c.id);   // the referrer spent it
    reversePayment({ provider: "mercadopago", externalId: "ref-cb-1", status: "charged_back" });
    expect([findById(c.id)!.credits, findById(d.id)!.credits]).toEqual([0, 0]);
    expect((getDb().prepare("SELECT status FROM referrals WHERE referredId = ?").get(d.id) as { status: string }).status).toBe("reversed");
  });

  it("self-referral is ignored", async () => {
    const a = await user();
    expect(recordReferral(a.id, a.id)).toBe(false);
    expect(recordReferral(null, a.id)).toBe(false);
  });
});
