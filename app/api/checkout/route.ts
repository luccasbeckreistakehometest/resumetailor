import { NextResponse } from "next/server";
import Stripe from "stripe";
import { currentUser } from "@/lib/server/session";
import { packByKey } from "@/lib/packs";
import { baseUrl, canSell, secretEnv } from "@/lib/server/env";
import { jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

/** Global card checkout in USD. The user id travels in metadata so the webhook knows whom to credit. */
export async function POST(request: Request) {
  const key = secretEnv("STRIPE_SECRET_KEY");
  if (!key || !canSell()) return jsonError("payments_off", 503);
  const user = await currentUser();
  if (!user) return jsonError("sign_in_required", 401);
  const { pack: packKey } = await request.json().catch(() => ({}));
  const pack = packByKey(String(packKey ?? "1"));
  // Return URLs come from configuration, never from the request's Origin header.
  const origin = baseUrl();
  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: pack.usd * 100, product_data: { name: `${pack.credits} ResumeTailor credit${pack.credits > 1 ? "s" : ""}`, description: "Prepaid credits, no subscription. Each credit unlocks one full kit: résumé, cover letter, LinkedIn About and interview prep." } } }],
      metadata: { userId: user.id, pack: pack.key, credits: String(pack.credits) },
      payment_intent_data: { metadata: { userId: user.id, pack: pack.key, credits: String(pack.credits) } },
      customer_email: user.email,
      success_url: `${origin}/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("stripe checkout", error);
    return jsonError("checkout_failed", 502);
  }
}
