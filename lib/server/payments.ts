import { getDb, newId, nowIso } from "@/lib/server/db";
import { moveCredits } from "@/lib/server/users";

/**
 * Records a payment and grants its credits exactly once. Both webhooks and the success-page
 * fallback call this, so the (provider, externalId) unique index is what stops double grants.
 */
export function settlePayment(input: {
  provider: "stripe" | "mercadopago"; externalId: string; userId: string; pack: string; credits: number;
  amount: number; currency: string; status: "approved" | "rejected" | "pending";
}): { granted: boolean } {
  const db = getDb();
  return db.transaction(() => {
    const existing = db.prepare("SELECT id, status FROM payments WHERE provider = ? AND externalId = ?").get(input.provider, input.externalId) as { id: string; status: string } | undefined;
    if (existing?.status === "approved") return { granted: false };
    const id = existing?.id ?? newId("pay");
    if (existing) {
      db.prepare("UPDATE payments SET status = ?, settledAt = ? WHERE id = ?").run(input.status, input.status === "approved" ? nowIso() : null, id);
    } else {
      db.prepare("INSERT INTO payments (id,userId,provider,externalId,pack,credits,amount,currency,status,createdAt,settledAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .run(id, input.userId, input.provider, input.externalId, input.pack, input.credits, input.amount, input.currency, input.status, nowIso(), input.status === "approved" ? nowIso() : null);
    }
    if (input.status !== "approved") return { granted: false };
    moveCredits(input.userId, input.credits, "purchase", id);
    return { granted: true };
  })();
}
