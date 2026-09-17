import { NextResponse } from "next/server";
import { currentUserRow } from "@/lib/server/session";
import { toPublic } from "@/lib/server/users";
import { paymentsFor } from "@/lib/server/payments";
import { getDb } from "@/lib/server/db";
import { jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** The account page: the profile, how credits work, and the payment history. Read-only. */
export async function GET() {
  const row = await currentUserRow();
  if (!row) return jsonError("sign_in_required", 401);
  const kits = (getDb().prepare("SELECT COUNT(*) n FROM generations WHERE userId = ?").get(row.id) as { n: number }).n;
  return NextResponse.json({
    user: toPublic(row), kits, termsAcceptedAt: row.termsAcceptedAt,
    payments: paymentsFor(row.id).map((p) => ({ id: p.id, provider: p.provider, pack: p.pack, credits: p.credits, amount: p.amount, currency: p.currency, status: p.status, createdAt: p.createdAt })),
  }, { headers: { "Cache-Control": "no-store" } });
}
