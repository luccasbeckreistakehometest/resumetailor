import { NextResponse } from "next/server";
import Stripe from "stripe";
import { settlePayment } from "@/lib/server/payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY, secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const stripe = new Stripe(key);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const userId = s.metadata?.userId, credits = Number(s.metadata?.credits ?? 0);
    if (userId && credits > 0) {
      settlePayment({
        provider: "stripe", externalId: s.id, userId, pack: s.metadata?.pack ?? "1", credits,
        amount: (s.amount_total ?? 0) / 100, currency: (s.currency ?? "usd").toUpperCase(),
        status: s.payment_status === "paid" ? "approved" : "pending",
      });
    }
  }
  return NextResponse.json({ received: true });
}
