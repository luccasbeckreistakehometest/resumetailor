"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthModal } from "@/components/AuthButton";
import { useAuth } from "@/components/AuthProvider";
import { Container, Eyebrow, Stamp } from "@/components/ui";
import { PACKS } from "@/lib/packs";

const COPY = {
  en: { title: "Simple pricing. No subscription.", subtitle: "Buy credits once — each credit unlocks one full kit: resume, cover letter, LinkedIn About and interview prep. They never expire.", free: "Free", freeDesc: "Your match score and company insights — unlimited previews. And your first full kit is on us when you create an account.", perCv: "per kit", save: "save", cta: "Buy credits", note: "Card payments by Stripe.", best: "Most chosen" },
  pt: { title: "Preço simples. Sem assinatura.", subtitle: "Compra créditos uma vez — cada crédito libera um kit completo: currículo, carta, Sobre do LinkedIn e preparação pra entrevista. Não vencem.", free: "Grátis", freeDesc: "Sua nota de compatibilidade e os insights da empresa — prévias ilimitadas. E o primeiro kit completo é por nossa conta quando você cria a conta.", perCv: "por kit", save: "economize", cta: "Comprar créditos", note: "Pix, boleto ou cartão pelo Mercado Pago.", best: "Mais escolhido" },
  es: { title: "Precio simple. Sin suscripción.", subtitle: "Compra créditos una vez — cada crédito desbloquea un kit completo: CV, carta, About de LinkedIn y preparación de entrevista. No caducan.", free: "Gratis", freeDesc: "Tu puntaje y la información de la empresa — vistas previas ilimitadas. Y tu primer kit completo es gratis al crear la cuenta.", perCv: "por kit", save: "ahorra", cta: "Comprar créditos", note: "Pago con tarjeta vía Stripe.", best: "El más elegido" },
};

export default function PricingPage() {
  const { lang, x } = useI18n();
  const { user, payments } = useAuth();
  const c = COPY[lang];
  const br = lang === "pt";
  const [busy, setBusy] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  const money = (p: (typeof PACKS)[number]) => br ? `R$ ${p.brl}` : `$${p.usd}`;
  const unit = (p: (typeof PACKS)[number]) => (br ? p.brl : p.usd) / p.credits;

  async function buy(key: string) {
    if (!user) { setPending(key); setAuthOpen(true); return; }
    setBusy(key); setError("");
    const r = await fetch(br ? "/api/checkout/mercadopago" : "/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pack: key }) });
    const j = await r.json();
    setBusy(null);
    if (!r.ok || !j.url) { setError(j.error || x.errors.generic); return; }
    window.location.assign(j.url);
  }

  const configured = br ? payments.mercadopago : payments.stripe;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="max-w-5xl py-16">
        <div className="max-w-2xl"><Eyebrow>{x.nav.pricing}</Eyebrow><h1 className="font-display mt-2 text-5xl text-ink">{c.title}</h1><p className="mt-4 text-ink-2">{c.subtitle}</p></div>
        <div className="mt-12 grid gap-5 md:grid-cols-4">
          <div className="card p-6">
            <p className="eyebrow">{c.free}</p>
            <p className="font-display mt-2 text-4xl text-ink">{br ? "R$ 0" : "$0"}</p>
            <p className="mt-3 text-sm text-ink-2">{c.freeDesc}</p>
          </div>
          {PACKS.map((p, i) => (
            <div key={p.key} className={"card relative p-6 " + (i === 1 ? "border-2 !border-ink" : "")} data-testid={`pack-${p.key}`}>
              {i === 1 && <div className="absolute -top-3 left-5"><Stamp>{c.best}</Stamp></div>}
              <p className="eyebrow">{x.credits.badge(p.credits)}</p>
              <p className="font-display mt-2 text-4xl text-ink">{money(p)}</p>
              <p className="mt-1 text-sm text-muted">{br ? "R$" : "$"}{unit(p).toFixed(0)} {c.perCv}{i > 0 && <span className="ml-2 text-moss">· {c.save} {Math.round((1 - unit(p) / unit(PACKS[0])) * 100)}%</span>}</p>
              <button onClick={() => buy(p.key)} disabled={busy === p.key || !configured} className="btn btn-primary mt-6 w-full" data-testid={`buy-${p.key}`}>{busy === p.key ? x.auth.working : c.cta}</button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">{c.note}{!configured && ` · ${x.pricing.notConfigured}`}</p>
        {error && <p className="mt-3 text-sm text-oxblood" role="alert">{error}</p>}
      </Container>
      <SiteFooter />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onDone={() => { if (pending) setTimeout(() => void buy(pending), 150); }} />}
    </div>
  );
}
