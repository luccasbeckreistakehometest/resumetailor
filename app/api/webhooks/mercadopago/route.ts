import { NextResponse } from "next/server";
import { applyMpAction, fetchMpPayment, mpAction } from "@/lib/server/payments";
import { secretEnv } from "@/lib/server/env";

export const runtime = "nodejs";

/**
 * Mercado Pago only tells us a payment id. The payment itself is fetched back with our token, so a
 * forged notification can never grant credits — it can only make us look up a real payment.
 * A failed lookup answers 5xx so Mercado Pago retries; refunds and chargebacks take credits back.
 */
export async function POST(request: Request) {
  if (!secretEnv("MP_ACCESS_TOKEN")) return NextResponse.json({ ok: false }, { status: 503 });
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const paymentId = body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const type = body?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  if (!paymentId || (type && type !== "payment")) return NextResponse.json({ ok: true });
  try {
    const found = await fetchMpPayment(String(paymentId));
    if (!found.ok) {
      // Unknown id (a dashboard test ping, a forged id): nothing to retry. Anything else: ask for a retry.
      if (found.status === 404) return NextResponse.json({ ok: true, ignored: true });
      console.error(`mp webhook: lookup of ${paymentId} failed with ${found.status}`);
      return NextResponse.json({ ok: false }, { status: 502 });
    }
    const result = applyMpAction(mpAction(found.payment));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("mp webhook", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
