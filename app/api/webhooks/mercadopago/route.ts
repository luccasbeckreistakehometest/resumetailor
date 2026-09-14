import { NextResponse } from "next/server";
import { settlePayment } from "@/lib/server/payments";

export const runtime = "nodejs";

/**
 * Mercado Pago only tells us a payment id. The payment itself is fetched back with our token, so a
 * forged notification can never grant credits — it can only make us look up a real payment.
 */
export async function POST(request: Request) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ ok: false }, { status: 503 });
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const paymentId = body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const type = body?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  if (!paymentId || (type && type !== "payment")) return NextResponse.json({ ok: true });
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return NextResponse.json({ ok: true });
    const p = await res.json();
    const userId = p?.metadata?.user_id ?? p?.external_reference;
    const credits = Number(p?.metadata?.credits ?? 0);
    if (userId && credits > 0) {
      settlePayment({
        provider: "mercadopago", externalId: String(p.id), userId, pack: String(p?.metadata?.pack ?? "1"), credits,
        amount: Number(p.transaction_amount ?? 0), currency: String(p.currency_id ?? "BRL"),
        status: p.status === "approved" ? "approved" : p.status === "rejected" || p.status === "cancelled" ? "rejected" : "pending",
      });
    }
  } catch (error) {
    console.error("mp webhook", error);
  }
  return NextResponse.json({ ok: true });
}
