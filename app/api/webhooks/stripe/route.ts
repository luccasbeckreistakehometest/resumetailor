import { NextResponse } from "next/server";
import Stripe from "stripe";
import { reversePayment, settlePayment } from "@/lib/server/payments";
import { secretEnv } from "@/lib/server/env";

export const runtime = "nodejs";

/** checkout.session.completed grants credits; charge.refunded takes them back (proportionally for partial refunds). */
export async function POST(request: Request) {
  const key = secretEnv("STRIPE_SECRET_KEY"), secret = secretEnv("STRIPE_WEBHOOK_SECRET");
  if (!key || !secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const stripe = new Stripe(key);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.metadata?.userId, credits = Number(s.metadata?.credits ?? 0);
      if (userId && credits > 0) {
        settlePayment({
          provider: "stripe", externalId: s.id, userId, pack: s.metadata?.pack ?? "1", credits,
          amount: (s.amount_total ?? 0) / 100, currency: (s.currency ?? "usd").toUpperCase(),
          status: s.payment_status === "paid" ? "approved" : "pending",
          providerRef: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null,
        });
      }
    } else if (event.type === "charge.refunded") {
      const c = event.data.object as Stripe.Charge;
      const intent = typeof c.payment_intent === "string" ? c.payment_intent : c.payment_intent?.id;
      if (intent) {
        const share = c.amount ? c.amount_refunded / c.amount : 1;
        const res = reversePayment({ provider: "stripe", providerRef: intent, status: "refunded", share });
        if (!res.found) console.error(`stripe refund for unknown payment intent ${intent}`);
      }
    } else if (event.type === "charge.dispute.created") {
      const d = event.data.object as Stripe.Dispute;
      const intent = typeof d.payment_intent === "string" ? d.payment_intent : d.payment_intent?.id;
      if (intent) reversePayment({ provider: "stripe", providerRef: intent, status: "charged_back", share: 1 });
    }
  } catch (error) {
    console.error("stripe webhook", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
