import { NextResponse } from "next/server";
import Stripe from "stripe";
import { currentUser } from "@/lib/server/session";
import { settlePayment } from "@/lib/server/payments";
import { findById, toPublic } from "@/lib/server/users";

export const runtime = "nodejs";

/** Success-page fallback for Stripe: if the webhook has not landed yet, settle from the session directly. */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ paid: false }, { status: 401 });
  const sessionId = new URL(request.url).searchParams.get("session_id");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!sessionId || !key) return NextResponse.json({ paid: false, user });
  try {
    const s = await new Stripe(key).checkout.sessions.retrieve(sessionId);
    const paid = s.payment_status === "paid";
    if (paid && s.metadata?.userId === user.id) {
      settlePayment({
        provider: "stripe", externalId: s.id, userId: user.id, pack: s.metadata?.pack ?? "1", credits: Number(s.metadata?.credits ?? 1),
        amount: (s.amount_total ?? 0) / 100, currency: (s.currency ?? "usd").toUpperCase(), status: "approved",
      });
    }
    return NextResponse.json({ paid, user: toPublic(findById(user.id)!) });
  } catch {
    return NextResponse.json({ paid: false, user });
  }
}
