import { getDb, newId, nowIso } from "@/lib/server/db";
import { findById, moveCredits } from "@/lib/server/users";
import { canSell, secretEnv, testFixturesAllowed } from "@/lib/server/env";
import { serverEvent } from "@/lib/server/analytics";

export type Provider = "stripe" | "mercadopago";
export type SettleStatus = "approved" | "rejected" | "pending";

export interface PaymentRow {
  id: string; userId: string | null; provider: Provider; externalId: string; pack: string; credits: number; amount: number;
  currency: string; status: string; createdAt: string; settledAt: string | null; providerRef: string | null;
  reversedCredits: number; reversedAt: string | null;
}

/** A payment in one of these states was paid at some point (its credits were granted). */
const PAID_STATES = ["approved", "partially_refunded", "refunded", "charged_back"];

/**
 * Records a payment and grants its credits exactly once. Webhooks and the success-page
 * verification both call this, so the (provider, externalId) unique index stops double grants.
 */
export function settlePayment(input: {
  provider: Provider; externalId: string; userId: string; pack: string; credits: number;
  amount: number; currency: string; status: SettleStatus; providerRef?: string | null;
}): { granted: boolean } {
  const db = getDb();
  return db.transaction(() => {
    const existing = db.prepare("SELECT id, status FROM payments WHERE provider = ? AND externalId = ?").get(input.provider, input.externalId) as { id: string; status: string } | undefined;
    // Terminal states never move back to pending/approved from a late or replayed notification.
    if (existing && PAID_STATES.includes(existing.status)) {
      if (input.providerRef) db.prepare("UPDATE payments SET providerRef = COALESCE(providerRef, ?) WHERE id = ?").run(input.providerRef, existing.id);
      return { granted: false };
    }
    const id = existing?.id ?? newId("pay");
    if (existing) {
      db.prepare("UPDATE payments SET status = ?, settledAt = ?, providerRef = COALESCE(providerRef, ?) WHERE id = ?")
        .run(input.status, input.status === "approved" ? nowIso() : null, input.providerRef ?? null, id);
    } else {
      db.prepare("INSERT INTO payments (id,userId,provider,externalId,pack,credits,amount,currency,status,createdAt,settledAt,providerRef) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(id, input.userId, input.provider, input.externalId, input.pack, input.credits, input.amount, input.currency, input.status, nowIso(), input.status === "approved" ? nowIso() : null, input.providerRef ?? null);
    }
    if (input.status !== "approved") return { granted: false };
    moveCredits(input.userId, input.credits, "purchase", id);
    serverEvent({ userId: input.userId }, "purchase", { amount: input.amount, currency: input.currency, pack: input.pack, provider: input.provider });
    return { granted: true };
  })();
}

/**
 * A refund or a chargeback takes the credits back — as many as are left: credits already spent
 * on kits cannot be recovered, and the balance never goes negative (the ledger shows what was
 * actually taken). `share` is the refunded fraction (1 = everything; less marks the payment
 * partially_refunded); repeated notifications are idempotent because reversedCredits remembers how
 * much of the payment was already handled. A full refund or a chargeback is never downgraded.
 */
export function reversePayment(input: { provider: Provider; externalId?: string; providerRef?: string; status: "refunded" | "charged_back"; share?: number }):
  { found: boolean; taken: number } {
  const db = getDb();
  return db.transaction(() => {
    const row = (input.externalId
      ? db.prepare("SELECT * FROM payments WHERE provider = ? AND externalId = ?").get(input.provider, input.externalId)
      : db.prepare("SELECT * FROM payments WHERE provider = ? AND providerRef = ?").get(input.provider, input.providerRef ?? "")) as PaymentRow | undefined;
    if (!row) return { found: false, taken: 0 };
    const wasPaid = PAID_STATES.includes(row.status);
    const share = Math.min(1, Math.max(0, input.share ?? 1));
    const next = row.status === "charged_back" ? "charged_back"
      : input.status === "charged_back" ? "charged_back"
      : share >= 1 || row.status === "refunded" ? "refunded" : "partially_refunded";
    db.prepare("UPDATE payments SET status = ?, reversedAt = COALESCE(reversedAt, ?) WHERE id = ?").run(next, nowIso(), row.id);
    if (!wasPaid || !row.userId) return { found: true, taken: 0 };
    const target = Math.floor(row.credits * share);
    const due = target - row.reversedCredits;
    if (due <= 0) return { found: true, taken: 0 };
    const balance = findById(row.userId)?.credits ?? 0;
    const take = Math.min(due, balance);
    if (take > 0) moveCredits(row.userId, -take, input.status === "refunded" ? "refund" : "chargeback", row.id);
    // What could not be taken back (already spent) is recorded as handled too, so a replay does not retry forever.
    db.prepare("UPDATE payments SET reversedCredits = reversedCredits + ? WHERE id = ?").run(due, row.id);
    return { found: true, taken: take };
  })();
}

export function getPayment(provider: Provider, externalId: string): PaymentRow | null {
  return (getDb().prepare("SELECT * FROM payments WHERE provider = ? AND externalId = ?").get(provider, externalId) as PaymentRow) ?? null;
}

export function paymentsFor(userId: string): PaymentRow[] {
  return getDb().prepare("SELECT * FROM payments WHERE userId = ? ORDER BY createdAt DESC LIMIT 100").all(userId) as PaymentRow[];
}

/**
 * Which checkouts this server offers: a provider needs its key, and a production server also
 * needs the seller identified (canSell). Webhooks and payment verification do not look at this —
 * a payment already made is always settled or reversed.
 */
export function paymentsConfig(): { stripe: boolean; mercadopago: boolean } {
  const sell = canSell();
  return { stripe: sell && !!secretEnv("STRIPE_SECRET_KEY"), mercadopago: sell && !!secretEnv("MP_ACCESS_TOKEN") };
}

/** Mercado Pago's payment object, only the fields this app reads. */
export interface MpPayment {
  id: number | string; status?: string; status_detail?: string; transaction_amount?: number; currency_id?: string;
  transaction_amount_refunded?: number; external_reference?: string | null;
  metadata?: { user_id?: string; pack?: string; credits?: number | string } | null;
}

export type MpAction =
  | { kind: "settle"; externalId: string; userId: string; pack: string; credits: number; amount: number; currency: string; status: SettleStatus; refundShare?: number }
  | { kind: "reverse"; externalId: string; status: "refunded" | "charged_back"; share: number }
  | { kind: "ignore"; reason: string };

/** What one Mercado Pago payment means for our ledger. Pure, so it is unit-tested. */
export function mpAction(p: MpPayment): MpAction {
  const externalId = String(p.id ?? "");
  if (!externalId) return { kind: "ignore", reason: "no id" };
  const status = p.status ?? "";
  const amount = Number(p.transaction_amount ?? 0);
  if (status === "refunded" || status === "charged_back") {
    const refunded = Number(p.transaction_amount_refunded ?? 0);
    const share = status === "charged_back" || !amount || !refunded ? 1 : Math.min(1, refunded / amount);
    return { kind: "reverse", externalId, status, share };
  }
  const userId = p.metadata?.user_id ?? p.external_reference ?? "";
  const credits = Number(p.metadata?.credits ?? 0);
  if (!userId || !(credits > 0)) return { kind: "ignore", reason: "not one of our checkouts" };
  const mapped: SettleStatus = status === "approved" ? "approved" : ["rejected", "cancelled"].includes(status) ? "rejected" : "pending";
  const action: MpAction = { kind: "settle", externalId, userId: String(userId), pack: String(p.metadata?.pack ?? "1"), credits, amount, currency: String(p.currency_id ?? "BRL"), status: mapped };
  // A partial refund leaves the payment "approved" (status_detail partially_refunded) with the refunded amount set.
  const refunded = Number(p.transaction_amount_refunded ?? 0);
  if (mapped === "approved" && refunded > 0 && amount > 0) return { ...action, refundShare: Math.min(1, refunded / amount) };
  return action;
}

export function applyMpAction(a: MpAction): { granted: boolean; reversed: number } {
  if (a.kind === "settle") {
    const { refundShare, ...settle } = a;
    const granted = settlePayment({ provider: "mercadopago", ...settle }).granted;
    const reversed = refundShare ? reversePayment({ provider: "mercadopago", externalId: a.externalId, status: "refunded", share: refundShare }).taken : 0;
    return { granted, reversed };
  }
  if (a.kind === "reverse") return { granted: false, reversed: reversePayment({ provider: "mercadopago", externalId: a.externalId, status: a.status, share: a.share }).taken };
  return { granted: false, reversed: 0 };
}

/** Fetches a payment back from Mercado Pago with our token (so a forged notification grants nothing). */
export async function fetchMpPayment(paymentId: string): Promise<{ ok: true; payment: MpPayment } | { ok: false; status: number }> {
  const token = secretEnv("MP_ACCESS_TOKEN");
  if (!token) return { ok: false, status: 503 };
  if (process.env.MP_API_MOCK_DIR && testFixturesAllowed()) return fetchMockPayment(paymentId);
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, payment: (await res.json()) as MpPayment };
}

/** e2e only: payments are JSON files in MP_API_MOCK_DIR, written by the test. */
async function fetchMockPayment(paymentId: string): Promise<{ ok: true; payment: MpPayment } | { ok: false; status: number }> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const file = path.join(process.env.MP_API_MOCK_DIR!, `${paymentId.replace(/[^\w-]/g, "")}.json`);
  if (!fs.existsSync(file)) return { ok: false, status: 404 };
  return { ok: true, payment: JSON.parse(fs.readFileSync(file, "utf8")) as MpPayment };
}
