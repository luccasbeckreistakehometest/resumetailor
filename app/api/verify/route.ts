import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { currentUser } from "@/lib/server/session";
import { applyMpAction, fetchMpPayment, getPayment, mpAction, settlePayment } from "@/lib/server/payments";
import { findById } from "@/lib/server/users";
import { secretEnv } from "@/lib/server/env";
import { jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

const schema = z.object({
  provider: z.enum(["stripe", "mp"]),
  sessionId: z.string().max(200).optional(),
  paymentId: z.string().max(40).optional(),
});

type Status = "paid" | "pending" | "failed" | "refunded";

/**
 * The success page's check. It settles the payment from the provider directly when the webhook
 * has not landed yet (Stripe session, or Mercado Pago payment_id from the return URL), and only
 * ever reports "paid" once the credits are on the account; the balance comes back with it.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return jsonError("sign_in_required", 401);
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("bad_request", 400);
  const { provider, sessionId, paymentId } = parsed.data;
  let status: Status = "pending";
  try {
    if (provider === "stripe") {
      const key = secretEnv("STRIPE_SECRET_KEY");
      if (!key || !sessionId) return jsonError("payments_off", 400);
      const s = await new Stripe(key).checkout.sessions.retrieve(sessionId);
      if (s.metadata?.userId !== user.id) return jsonError("not_found", 404);
      if (s.payment_status === "paid") {
        settlePayment({
          provider: "stripe", externalId: s.id, userId: user.id, pack: s.metadata?.pack ?? "1", credits: Number(s.metadata?.credits ?? 1),
          amount: (s.amount_total ?? 0) / 100, currency: (s.currency ?? "usd").toUpperCase(), status: "approved",
          providerRef: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null,
        });
      }
      status = statusOf(getPayment("stripe", s.id)?.status, s.status === "expired" ? "failed" : "pending");
    } else {
      if (!paymentId) return NextResponse.json({ status: "pending", credits: findById(user.id)?.credits ?? 0 });
      const found = await fetchMpPayment(paymentId);
      if (!found.ok) {
        if (found.status === 404) return jsonError("not_found", 404);
        return NextResponse.json({ status: "pending", credits: findById(user.id)?.credits ?? 0 });
      }
      const action = mpAction(found.payment);
      if (action.kind === "settle" && action.userId !== user.id) return jsonError("not_found", 404);
      if (action.kind === "reverse" && getPayment("mercadopago", action.externalId)?.userId !== user.id) return jsonError("not_found", 404);
      applyMpAction(action);
      const row = getPayment("mercadopago", String(found.payment.id));
      status = statusOf(row?.status, action.kind === "settle" && action.status === "rejected" ? "failed" : "pending");
    }
  } catch (error) {
    console.error("verify", error);
    return NextResponse.json({ status: "pending", credits: findById(user.id)?.credits ?? 0 });
  }
  return NextResponse.json({ status, credits: findById(user.id)?.credits ?? 0 });
}

function statusOf(dbStatus: string | undefined, fallback: Status): Status {
  if (dbStatus === "approved" || dbStatus === "partially_refunded") return "paid";
  if (dbStatus === "rejected") return "failed";
  if (dbStatus === "refunded" || dbStatus === "charged_back") return "refunded";
  return fallback;
}
