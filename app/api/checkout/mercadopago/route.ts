import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

export const runtime = "nodejs";

const TOKEN = process.env.MP_ACCESS_TOKEN;

// One-time credit packs (no subscription). Price in BRL. Unit price drops with size.
const PACKS: Record<string, { title: string; price: number; credits: number }> = {
  "1": { title: "1 currículo personalizado", price: 39, credits: 1 },
  "5": { title: "5 currículos personalizados", price: 149, credits: 5 },
  "15": { title: "15 currículos personalizados", price: 349, credits: 15 },
};

export async function POST(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json({ error: "Mercado Pago not configured (set MP_ACCESS_TOKEN)." }, { status: 400 });
  }
  try {
    const body = await req.json();
    const pack = PACKS[String(body.pack)] || PACKS["1"];
    const userId = typeof body.userId === "string" ? body.userId : "";
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const client = new MercadoPagoConfig({ accessToken: TOKEN });
    const pref = new Preference(client);

    const result = await pref.create({
      body: {
        items: [
          {
            id: String(body.pack || "1"),
            title: pack.title,
            quantity: 1,
            unit_price: pack.price,
            currency_id: "BRL",
          },
        ],
        // The webhook reads these to grant the right credits to the right user.
        metadata: { credits: pack.credits, user_id: userId },
        external_reference: userId,
        back_urls: {
          success: `${origin}/success?provider=mp`,
          failure: `${origin}/pricing?canceled=1`,
          pending: `${origin}/success?provider=mp&pending=1`,
        },
        auto_return: "approved",
        notification_url: `${origin}/api/webhooks/mercadopago`,
      },
    });

    return NextResponse.json({ url: result.init_point });
  } catch (err) {
    console.error("mercadopago checkout error", err);
    return NextResponse.json({ error: "Could not start Mercado Pago checkout." }, { status: 500 });
  }
}
