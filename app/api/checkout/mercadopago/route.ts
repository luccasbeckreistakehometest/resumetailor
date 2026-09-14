import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { currentUser } from "@/lib/server/session";
import { packByKey } from "@/lib/packs";

export const runtime = "nodejs";

/** Brazil: Pix, boleto and card through Checkout Pro, priced in BRL. */
export async function POST(request: Request) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "Pagamento não configurado ainda." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta para comprar créditos." }, { status: 401 });
  const { pack: packKey } = await request.json().catch(() => ({}));
  const pack = packByKey(String(packKey ?? "1"));
  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  try {
    const pref = new Preference(new MercadoPagoConfig({ accessToken: token }));
    const result = await pref.create({
      body: {
        items: [{ id: pack.key, title: `${pack.credits} crédito${pack.credits > 1 ? "s" : ""} ResumeTailor`, quantity: 1, unit_price: pack.brl, currency_id: "BRL" }],
        metadata: { user_id: user.id, pack: pack.key, credits: pack.credits },
        external_reference: user.id,
        payer: { email: user.email },
        back_urls: { success: `${origin}/success?provider=mp`, failure: `${origin}/pricing?canceled=1`, pending: `${origin}/success?provider=mp&pending=1` },
        auto_return: "approved",
        notification_url: `${origin}/api/webhooks/mercadopago`,
      },
    });
    return NextResponse.json({ url: result.init_point });
  } catch (error) {
    console.error("mercadopago checkout", error);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}
