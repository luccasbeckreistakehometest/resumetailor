import { NextResponse } from "next/server";
import Stripe from "stripe";
import { currentUser } from "@/lib/server/session";
import { packByKey } from "@/lib/packs";

export const runtime = "nodejs";

/** Global card checkout in USD. The user id travels in metadata so the webhook knows whom to credit. */
export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "Card payments are not configured yet." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to buy credits." }, { status: 401 });
  const { pack: packKey } = await request.json().catch(() => ({}));
  const pack = packByKey(String(packKey ?? "1"));
  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: pack.usd * 100, product_data: { name: `${pack.credits} ResumeTailor credit${pack.credits > 1 ? "s" : ""}`, description: "Each credit unlocks one full kit: resume, cover letter, LinkedIn About and interview prep." } } }],
      metadata: { userId: user.id, pack: pack.key, credits: String(pack.credits) },
      customer_email: user.email,
      success_url: `${origin}/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("stripe checkout", error);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }
}
