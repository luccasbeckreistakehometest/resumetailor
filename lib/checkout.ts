import type { Pack } from "@/lib/packs";

export type CheckoutProvider = "stripe" | "mercadopago";
export type Lang3 = "en" | "pt" | "es";

/**
 * Which checkouts a visitor is offered, best first. Brazilian Portuguese defaults to Mercado
 * Pago; everyone else to Stripe when it is on. With only Mercado Pago configured, every language
 * pays through it (in BRL, labelled). With neither, there is nothing to offer — no dead buttons.
 */
export function checkoutOptions(cfg: { stripe: boolean; mercadopago: boolean }, lang: Lang3): CheckoutProvider[] {
  const out: CheckoutProvider[] = [];
  if (lang === "pt") {
    if (cfg.mercadopago) out.push("mercadopago");
    if (cfg.stripe) out.push("stripe");
  } else {
    if (cfg.stripe) out.push("stripe");
    if (cfg.mercadopago) out.push("mercadopago");
  }
  return out;
}

export const currencyOf = (provider: CheckoutProvider | null, lang: Lang3): "BRL" | "USD" =>
  provider === "mercadopago" ? "BRL" : provider === "stripe" ? "USD" : lang === "pt" ? "BRL" : "USD";

/** "R$ 39" for Brazilians; "R$ 39 (BRL)" when someone else is about to pay in reais; "$9" / "US$ 9". */
export function priceLabel(pack: Pack, currency: "BRL" | "USD", lang: Lang3): string {
  if (currency === "BRL") return lang === "pt" ? `R$ ${pack.brl}` : `R$ ${pack.brl} (BRL)`;
  return lang === "en" ? `$${pack.usd}` : `US$ ${pack.usd}`;
}

export const unitPrice = (pack: Pack, currency: "BRL" | "USD") => (currency === "BRL" ? pack.brl : pack.usd) / pack.credits;

export const checkoutEndpoint = (provider: CheckoutProvider) => (provider === "mercadopago" ? "/api/checkout/mercadopago" : "/api/checkout");
