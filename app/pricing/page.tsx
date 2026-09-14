"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/components/AuthProvider";

const COPY = {
  en: {
    title: "Simple pricing. No subscription.",
    subtitle: "Buy credits once — each credit unlocks one fully tailored kit (resume + cover letter + LinkedIn + interview prep). They never expire.",
    free: "Free",
    freeDesc: "See your match score and company insights — unlimited previews.",
    perCv: "per CV",
    save: "save",
    cta: "Buy credits",
    freeCta: "Try it free",
    note: "Global payments via Stripe (card). Brazil via Mercado Pago (Pix, boleto, card).",
    currency: "$",
    packs: [{ k: "1", c: 1, price: 9, unit: 9 }, { k: "5", c: 5, price: 35, unit: 7 }, { k: "15", c: 15, price: 75, unit: 5 }],
    region: "global",
  },
  pt: {
    title: "Preço simples. Sem assinatura.",
    subtitle: "Compre créditos uma vez — cada crédito desbloqueia um kit completo (currículo + carta + LinkedIn + preparação de entrevista). Não expiram.",
    free: "Grátis",
    freeDesc: "Veja sua nota de compatibilidade e os insights da empresa — prévias ilimitadas.",
    perCv: "por CV",
    save: "economize",
    cta: "Comprar créditos",
    freeCta: "Testar grátis",
    note: "Pagamento no Brasil via Mercado Pago (Pix, boleto, cartão). Global via Stripe (cartão).",
    currency: "R$",
    packs: [{ k: "1", c: 1, price: 39, unit: 39 }, { k: "5", c: 5, price: 149, unit: 30 }, { k: "15", c: 15, price: 349, unit: 23 }],
    region: "br",
  },
  es: {
    title: "Precio simple. Sin suscripción.",
    subtitle: "Compra créditos una vez — cada crédito desbloquea un kit completo (currículum + carta + LinkedIn + preparación de entrevista). No caducan.",
    free: "Gratis",
    freeDesc: "Mira tu puntaje de coincidencia e información de la empresa — vistas previas ilimitadas.",
    perCv: "por CV",
    save: "ahorra",
    cta: "Comprar créditos",
    freeCta: "Probar gratis",
    note: "Pagos globales con Stripe (tarjeta). Brasil con Mercado Pago (Pix, boleto, tarjeta).",
    currency: "$",
    packs: [{ k: "1", c: 1, price: 9, unit: 9 }, { k: "5", c: 5, price: 35, unit: 7 }, { k: "15", c: 15, price: 75, unit: 5 }],
    region: "global",
  },
};

export default function PricingPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const c = COPY[lang];
  const [busy, setBusy] = useState("");

  async function buy(pack: string) {
    setBusy(pack);
    try {
      if (c.region === "br") {
        const res = await fetch("/api/checkout/mercadopago", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pack, userId: user?.id || "" }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else alert(data.error || "Checkout unavailable. Finish setup first.");
      } else {
        const res = await fetch("/api/checkout", { method: "POST" });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else alert(data.error || "Checkout unavailable.");
      }
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">RT</div>
            <span className="text-base font-semibold tracking-tight">ResumeTailor</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-5 py-16">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[700px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="relative">
          <h1 className="text-center text-4xl font-extrabold tracking-tight">{c.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-300">{c.subtitle}</p>

          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {/* Free */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold">{c.free}</h3>
              <div className="mt-2 text-3xl font-extrabold">{c.currency}0</div>
              <p className="mt-3 text-sm text-slate-300">{c.freeDesc}</p>
              <Link href="/start" className="mt-5 block rounded-lg border border-white/15 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/5">
                {c.freeCta}
              </Link>
            </div>

            {/* Packs */}
            {c.packs.map((p, i) => (
              <div key={p.k} className={"rounded-2xl border p-6 " + (i === 1 ? "border-indigo-400 bg-indigo-500/10" : "border-white/10 bg-white/5")}>
                <h3 className="text-lg font-semibold">{p.c} {p.c > 1 ? "CVs" : "CV"}</h3>
                <div className="mt-2 text-3xl font-extrabold">
                  {c.currency}{p.price}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {c.currency}{p.unit} {c.perCv}
                  {i > 0 && <span className="ml-1 text-emerald-400">· {c.save} {Math.round((1 - p.unit / c.packs[0].unit) * 100)}%</span>}
                </div>
                <button
                  onClick={() => buy(p.k)}
                  disabled={!!busy}
                  className="mt-5 block w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
                >
                  {busy === p.k ? "…" : c.cta}
                </button>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-xl text-center text-xs text-slate-400">{c.note}</p>
          <p className="mt-3 text-center text-sm">
            <Link href="/" className="text-slate-300 hover:text-white">← Home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
