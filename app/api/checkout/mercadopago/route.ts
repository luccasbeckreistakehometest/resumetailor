import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { currentUser } from "@/lib/server/session";
import { packByKey } from "@/lib/packs";
import { baseUrl, secretEnv, testFixturesAllowed } from "@/lib/server/env";
import { jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

/**
 * Pix, boleto and card through Checkout Pro, charged in BRL. Offered to every language (the
 * pricing page labels the currency); return and notification URLs come from NEXT_PUBLIC_BASE_URL.
 */
export async function POST(request: Request) {
  const token = secretEnv("MP_ACCESS_TOKEN");
  if (!token) return jsonError("payments_off", 503);
  const user = await currentUser();
  if (!user) return jsonError("sign_in_required", 401);
  const { pack: packKey } = await request.json().catch(() => ({}));
  const pack = packByKey(String(packKey ?? "1"));
  const origin = baseUrl();
  if (process.env.MP_API_MOCK_DIR && testFixturesAllowed()) {
    // e2e: no real preference; the test drives /success and the webhook with mocked payments.
    return NextResponse.json({ url: `${origin}/success?provider=mp&mock=1` });
  }
  try {
    const pref = new Preference(new MercadoPagoConfig({ accessToken: token }));
    const result = await pref.create({
      body: {
        items: [{ id: pack.key, title: `${pack.credits} crédito${pack.credits > 1 ? "s" : ""} ResumeTailor`, description: "Créditos pré-pagos, sem assinatura", quantity: 1, unit_price: pack.brl, currency_id: "BRL" }],
        metadata: { user_id: user.id, pack: pack.key, credits: pack.credits },
        external_reference: user.id,
        payer: { email: user.email },
        back_urls: { success: `${origin}/success?provider=mp`, failure: `${origin}/pricing?canceled=1`, pending: `${origin}/success?provider=mp` },
        auto_return: "approved",
        notification_url: `${origin}/api/webhooks/mercadopago`,
      },
    });
    return NextResponse.json({ url: result.init_point });
  } catch (error) {
    console.error("mercadopago checkout", error);
    return jsonError("checkout_failed", 502);
  }
}
