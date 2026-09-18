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
import { Button, Container, Icon, Notice, Seal } from "@/components/ui";
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
      <Container className="py-[var(--s-10)]">
        <div className="grid gap-[var(--gutter)] md:grid-cols-12">
          <div className="min-w-0 md:col-span-5">
            <p className="eyebrow">{x.nav.pricing}</p>
            <h1 className="doc-45 mt-[var(--s-3)] text-[color:var(--ink)]">{c.title}</h1>
            <p className="mt-[var(--s-5)] max-w-[var(--measure)] font-sans text-[length:var(--ui-15)] leading-[var(--ui-15-lh)] text-[color:var(--ink-2)]">{c.subtitle}</p>
            <Suspense fallback={null}><CanceledNotice text={l.pricing.canceled} /></Suspense>

            {options.length > 1 && (
              <fieldset className="mt-[var(--s-7)]" data-testid="provider-choice">
                <legend className="eyebrow">{l.pricing.payIn}</legend>
                <div className="mt-[var(--s-3)] flex flex-wrap gap-[var(--s-2)]">
                  {options.map((p) => (
                    <label
                      key={p}
                      className={"inline-flex h-7 cursor-pointer items-center rounded-[var(--r-1)] border px-[var(--s-4)] font-sans text-[length:var(--ui-12)] font-medium " +
                        (provider === p ? "border-[var(--ink)] bg-[var(--ink)] text-[color:var(--on-ink)]" : "border-[var(--rule)] bg-[var(--sunken)] text-[color:var(--ink-2)] hover:border-[var(--ink-40)]")}
                    >
                      <input type="radio" name="provider" value={p} checked={provider === p} onChange={() => setChosen(p)} className="sr-only" data-testid={`provider-${p}`} />
                      {p === "mercadopago" ? l.pricing.optionMp : l.pricing.optionStripe}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="mt-[var(--s-8)] max-w-[var(--measure)]"><VoucherField /></div>

            <div className="mt-[var(--s-7)] flex flex-col gap-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]" data-testid="pricing-notes">
              {provider === "mercadopago" && <p data-testid="brl-note">{l.pricing.brlNote}</p>}
              {provider === "stripe" && <p>{l.pricing.usdNote}</p>}
              {!provider && !loading && (
                <Notice tone="query"><span data-testid="checkout-closed">{l.pricing.closed} <Link href="/start" className="font-medium text-[color:var(--ink)] underline underline-offset-[3px]">{l.menu.start} →</Link></span></Notice>
              )}
              <p>{l.pricing.prepaid} <Link href="/legal/refunds" className="underline underline-offset-[3px] hover:text-[color:var(--ink)]">{l.pricing.refundLink}</Link></p>
            </div>
            {error && <Notice tone="mark" icon="flag" className="mt-[var(--s-4)]"><span>{error}</span></Notice>}
          </div>

          {/* The price table: packs are rows, and the saving is its own column rather than a
              claim inside a card. Money the person pays is set in the document face. */}
          <div className="min-w-0 md:col-span-7 md:col-start-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left font-sans" style={{ minWidth: "480px" }}>
                <thead>
                  <tr>
                    {[x.nav.pricing, c.perCv, c.save, ""].map((h, i) => (
                      <th key={i} scope="col" className={"border-b border-[var(--rule)] pb-[var(--s-3)] font-sans text-[length:var(--ui-12)] font-medium text-[color:var(--ink-muted)] " + (i === 1 || i === 2 ? "text-right" : i === 3 ? "text-right" : "")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr data-testid="free-tier-row">
                    <td className="border-b border-[var(--rule-hairline)] py-[var(--s-5)] align-top">
                      <p className="font-serif text-[length:var(--doc-26)] font-semibold leading-none text-[color:var(--ink)]">{currency === "BRL" ? "R$ 0" : lang === "en" ? "$0" : "US$ 0"}</p>
                      <p className="mt-[var(--s-2)] max-w-[34ch] font-sans text-[length:var(--ui-12)] leading-[var(--ui-12-lh)] text-[color:var(--ink-muted)]" data-testid="free-tier">{features.insights ? l.pricing.freeWithInsights : l.pricing.freeNoInsights}</p>
                    </td>
                    <td className="border-b border-[var(--rule-hairline)] py-[var(--s-5)] text-right align-top font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-muted)]">—</td>
                    <td className="border-b border-[var(--rule-hairline)] py-[var(--s-5)] text-right align-top font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-muted)]">—</td>
                    <td className="border-b border-[var(--rule-hairline)] py-[var(--s-5)] text-right align-top">
                      <span className="eyebrow">{c.free}</span>
                    </td>
                  </tr>
                  {PACKS.map((p, i) => {
                    const saving = Math.round((1 - unitPrice(p, currency) / unitPrice(PACKS[0], currency)) * 100);
                    return (
                      <tr key={p.key} data-testid={`pack-${p.key}`} className={i === 1 ? "bg-[var(--sunken)]" : ""}>
                        <td className="border-b border-[var(--rule-hairline)] py-[var(--s-5)] align-top">
                          <div className="flex items-baseline gap-[var(--s-3)]">
                            <p className="font-serif text-[length:var(--doc-31)] font-semibold leading-none text-[color:var(--ink)]" data-testid={`price-${p.key}`}>{priceLabel(p, currency, lang)}</p>
                            {i === 1 && <Seal>{c.best}</Seal>}
                          </div>
                          <p className="mt-[var(--s-2)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{x.credits.badge(p.credits)}</p>
                        </td>
                        <td className="border-b border-[var(--rule-hairline)] py-[var(--s-5)] text-right align-top font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-2)]">
                          {currency === "BRL" ? "R$" : lang === "en" ? "$" : "US$"}{unitPrice(p, currency).toFixed(0)}
                        </td>
                        <td className="border-b border-[var(--rule-hairline)] py-[var(--s-5)] text-right align-top font-mono text-[length:var(--mn-13)] tabular-nums" style={{ color: i > 0 ? "var(--kept)" : "var(--ink-muted)" }}>
                          {i > 0 ? `−${saving}%` : "—"}
                        </td>
                        <td className="border-b border-[var(--rule-hairline)] py-[var(--s-5)] text-right align-top">
                          {provider && (
                            <Button size="sm" variant={i === 1 ? "primary" : "outline"} onClick={() => void buy(p.key)} loading={busy === p.key} disabled={busy !== null} data-testid={`buy-${p.key}`}>
                              {busy === p.key ? x.auth.working : c.cta}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <section className="mt-[var(--s-9)] border-t-2 border-[var(--ink)] pt-[var(--s-5)]" data-testid="pricing-checklist">
              <p className="doc-26 text-[color:var(--ink)]">{r.showcase.checklistTitle}</p>
              <ul className="mt-[var(--s-5)] grid gap-x-[var(--s-7)] sm:grid-cols-2">
                {r.showcase.checklist(limits).map((item) => (
                  <li key={item} className="flex items-start gap-[var(--s-3)] border-b border-[var(--rule-hairline)] py-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">
                    <span className="relative top-[2px] shrink-0 text-[color:var(--kept)]"><Icon name="check" size={16} /></span>{item}
                  </li>
                ))}
              </ul>
              <p className="mt-[var(--s-5)] font-sans text-[length:var(--ui-15)] font-semibold text-[color:var(--ink)]">{r.showcase.checklistFooter}</p>
            </section>
          </div>
        </div>
      </Container>
      <SiteFooter />
      {authOpen && <AuthModal initialMode="in" onClose={() => setAuthOpen(false)} onDone={() => { if (pending) setTimeout(() => void buy(pending), 150); }} />}
    </div>
  );
}
