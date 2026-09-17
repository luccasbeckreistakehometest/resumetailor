"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthModal } from "@/components/AuthButton";
import { useAuth } from "@/components/AuthProvider";
import { Container, Eyebrow, Stamp } from "@/components/ui";
import { PACKS } from "@/lib/packs";
import { VoucherField } from "@/components/VoucherField";
import { checkoutEndpoint, checkoutOptions, currencyOf, priceLabel, unitPrice, type CheckoutProvider } from "@/lib/checkout";

const COPY = {
  en: { title: "Simple pricing. No subscription.", subtitle: "Buy credits once — each credit unlocks one full kit: résumé, cover letter, LinkedIn About and interview prep. They never expire.", free: "Free", perCv: "per kit", save: "save", cta: "Buy credits", best: "Most chosen" },
  pt: { title: "Preço simples. Sem assinatura.", subtitle: "Compra créditos uma vez — cada crédito libera um kit completo: currículo, carta, Sobre do LinkedIn e preparação pra entrevista. Não vencem.", free: "Grátis", perCv: "por kit", save: "economize", cta: "Comprar créditos", best: "Mais escolhido" },
  es: { title: "Precio simple. Sin suscripción.", subtitle: "Compra créditos una vez — cada crédito desbloquea un kit completo: CV, carta, About de LinkedIn y preparación de entrevista. No caducan.", free: "Gratis", perCv: "por kit", save: "ahorra", cta: "Comprar créditos", best: "El más elegido" },
};

/** Read in its own Suspense boundary, so the rest of the page is rendered on the server. */
function CanceledNotice({ text }: { text: string }) {
  const params = useSearchParams();
  if (params.get("canceled") !== "1") return null;
  return <p className="mt-6 rounded-xl border border-gold bg-gold-2 px-4 py-3 text-sm text-ink" role="status" data-testid="checkout-canceled">{text}</p>;
}

function rememberCheckout(before: number, credits: number): void {
  try { sessionStorage.setItem("rt_checkout", JSON.stringify({ before, credits, at: Date.now() })); } catch {}
}

/**
 * Packs, and only the checkouts this server can run. Visitors outside Brazil can pay through
 * Mercado Pago (in BRL, labelled) when Stripe is off; with no provider at all there are no buy
 * buttons, just the free first kit.
 */
export function PricingView() {
  const { lang, x, l, r } = useI18n();
  const { payments, features, loading, refresh, limits } = useAuth();
  const c = COPY[lang];
  const options = checkoutOptions(payments, lang);
  const [chosen, setChosen] = useState<CheckoutProvider | null>(null);
  const provider = chosen && options.includes(chosen) ? chosen : options[0] ?? null;
  const currency = currencyOf(provider, lang);
  const [busy, setBusy] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function buy(key: string) {
    if (!provider) return;
    // The server decides who is signed in (a stale closure after signup would say nobody is).
    setBusy(key); setError("");
    const r = await fetch(checkoutEndpoint(provider), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pack: key }) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (r.status === 401) { setPending(key); setAuthOpen(true); return; }
    if (!r.ok || !j.url) { setError(apiErrorText(j, l, x.errors.generic)); return; }
    // Kept for /success: "paid" is shown only once the balance has actually grown. Read fresh from
    // the server — this function can run from a closure created before the visitor signed up.
    const before = (await refresh())?.credits ?? 0;
    rememberCheckout(before, PACKS.find((p) => p.key === key)?.credits ?? 1);
    window.location.assign(j.url);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <Container className="max-w-5xl py-12 sm:py-16">
        <div className="max-w-2xl"><Eyebrow>{x.nav.pricing}</Eyebrow><h1 className="font-display mt-2 text-4xl text-ink sm:text-5xl">{c.title}</h1><p className="mt-4 text-ink-2">{c.subtitle}</p></div>

        <Suspense fallback={null}><CanceledNotice text={l.pricing.canceled} /></Suspense>

        {options.length > 1 && (
          <fieldset className="mt-8" data-testid="provider-choice">
            <legend className="text-sm font-medium text-ink-2">{l.pricing.payIn}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {options.map((p) => (
                <label key={p} className={"flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm " + (provider === p ? "border-ink bg-ink text-paper" : "border-edge-2 text-ink-2 hover:border-ink")}>
                  <input type="radio" name="provider" value={p} checked={provider === p} onChange={() => setChosen(p)} className="sr-only" data-testid={`provider-${p}`} />
                  {p === "mercadopago" ? l.pricing.optionMp : l.pricing.optionStripe}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 md:grid-cols-4">
          <div className="card p-6">
            <p className="eyebrow">{c.free}</p>
            <p className="font-display mt-2 text-4xl text-ink">{currency === "BRL" ? "R$ 0" : lang === "en" ? "$0" : "US$ 0"}</p>
            <p className="mt-3 text-sm text-ink-2" data-testid="free-tier">{features.insights ? l.pricing.freeWithInsights : l.pricing.freeNoInsights}</p>
          </div>
          {PACKS.map((p, i) => (
            <div key={p.key} className={"card relative p-6 " + (i === 1 ? "border-2 !border-ink" : "")} data-testid={`pack-${p.key}`}>
              {i === 1 && <div className="absolute -top-3 left-5"><Stamp>{c.best}</Stamp></div>}
              <p className="eyebrow">{x.credits.badge(p.credits)}</p>
              <p className="font-display mt-2 text-3xl text-ink lg:text-4xl" data-testid={`price-${p.key}`}>{priceLabel(p, currency, lang)}</p>
              <p className="mt-1 text-sm text-muted">{currency === "BRL" ? "R$" : lang === "en" ? "$" : "US$"}{unitPrice(p, currency).toFixed(0)} {c.perCv}{i > 0 && <span className="ml-2 text-moss">· {c.save} {Math.round((1 - unitPrice(p, currency) / unitPrice(PACKS[0], currency)) * 100)}%</span>}</p>
              {provider && <button onClick={() => void buy(p.key)} disabled={busy !== null} className="btn btn-primary mt-6 w-full" data-testid={`buy-${p.key}`}>{busy === p.key ? x.auth.working : c.cta}</button>}
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border-2 border-ink p-6" data-testid="pricing-checklist">
          <p className="font-display text-3xl text-ink">{r.showcase.checklistTitle}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {r.showcase.checklist(limits).map((item) => <li key={item} className="flex gap-2 text-sm text-ink-2"><span className="text-moss">✓</span>{item}</li>)}
          </ul>
          <p className="mt-4 font-semibold text-ink">{r.showcase.checklistFooter}</p>
        </section>

        <div className="mt-8 max-w-xl"><VoucherField /></div>

        <div className="mt-6 space-y-1 text-sm text-muted" data-testid="pricing-notes">
          {provider === "mercadopago" && <p data-testid="brl-note">{l.pricing.brlNote}</p>}
          {provider === "stripe" && <p>{l.pricing.usdNote}</p>}
          {!provider && !loading && (
            <p className="rounded-xl border border-edge bg-surface px-4 py-3 text-ink-2" data-testid="checkout-closed">
              {l.pricing.closed} <Link href="/start" className="font-medium text-oxblood underline underline-offset-2">{l.menu.start} →</Link>
            </p>
          )}
          <p>{l.pricing.prepaid} <Link href="/legal/refunds" className="underline underline-offset-2 hover:text-ink">{l.pricing.refundLink}</Link></p>
        </div>
        {error && <p className="mt-3 text-sm text-oxblood" role="alert">{error}</p>}
      </Container>
      <SiteFooter />
      {authOpen && <AuthModal initialMode="in" onClose={() => setAuthOpen(false)} onDone={() => { if (pending) setTimeout(() => void buy(pending), 150); }} />}
    </div>
  );
}
