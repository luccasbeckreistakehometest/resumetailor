"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { calcCopy as C } from "@/app/i18n/r3/calculator";
import { cltAnnual, grossForNet, invoiceForNet, pjEquivalent, pjNet } from "@/lib/br/payroll2026";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = (v: string | null, dft: number) => {
  if (v === null || v.trim() === "") return dft;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : dft;
};
const KEYS = ["clt", "vr", "saude", "plr", "dep", "pj", "cont", "saudepj", "meses", "quero"] as const;
type Key = (typeof KEYS)[number];
const DEFAULTS: Record<Key, number> = { clt: 8000, vr: 800, saude: 400, plr: 0, dep: 0, pj: 0, cont: 150, saudepj: 400, meses: 12, quero: 7000 };

const Line = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className={"flex justify-between gap-3 py-1 text-sm " + (strong ? "font-semibold text-ink" : "text-ink-2")}><span>{label}</span><span>{value}</span></div>
);

/**
 * The calculator island: state lives in the URL (shareable, nothing stored). A PJ value of 0
 * means "use the PJ equivalent of this CLT".
 */
export function CltPjCalculator() {
  const params = useSearchParams();
  const [v, setV] = useState<Record<Key, string>>(() => Object.fromEntries(KEYS.map((k) => [k, params.get(k) ?? (k === "pj" ? "" : String(DEFAULTS[k]))])) as Record<Key, string>);
  const [copied, setCopied] = useState(false);
  const set = (k: Key, value: string) => {
    const next = { ...v, [k]: value };
    setV(next);
    const q = new URLSearchParams(Object.entries(next).filter(([, x]) => x.trim() !== ""));
    window.history.replaceState(null, "", `${window.location.pathname}?${q.toString()}`);
  };
  const n = (k: Key) => num(v[k], k === "pj" ? 0 : DEFAULTS[k]);

  const cltIn = { gross: n("clt"), mealMonthly: n("vr"), healthMonthly: n("saude"), plrYear: n("plr"), dependants: Math.round(n("dep")) };
  const pjOpts = { accountant: n("cont"), healthMonthly: n("saudepj"), monthsBilled: Math.min(12, Math.max(1, Math.round(n("meses")))) };
  const clt = cltAnnual(cltIn);
  const equivalent = pjEquivalent(cltIn, pjOpts);
  const invoice = n("pj") > 0 ? n("pj") : equivalent;
  const pj = pjNet({ invoice, ...pjOpts });
  const diff = pj.netYear - clt.packageYear;
  const wantNet = n("quero");

  const Field = (k: Key, label: string) => (
    <label key={k} className="block text-sm text-ink-2">
      {label}
      <input inputMode="decimal" className="field mt-1 !py-2" value={v[k]} placeholder={k === "pj" ? brl(equivalent) : ""} onChange={(e) => set(k, e.target.value)} data-testid={`calc-${k}`} />
    </label>
  );

  return (
    <div className="space-y-6" data-testid="calculator">
      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-5" data-testid="calc-col-clt">
          <p className="font-display text-2xl text-ink">{C.clt}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{Field("clt", C.fields.gross)}{Field("dep", C.fields.deps)}{Field("vr", C.fields.meal)}{Field("saude", C.fields.health)}{Field("plr", C.fields.plr)}</div>
          <div className="mt-4 border-t border-edge pt-3">
            <Line label={C.out.monthlyNet} value={brl(clt.monthlyNet)} strong />
            <Line label={`${C.out.inss} · ${C.out.irrf}`} value={`${brl(clt.inss)} · ${brl(clt.irrf)}`} />
            <Line label={C.out.thirteenth} value={brl(clt.thirteenthNet)} />
            <Line label={C.out.vacation} value={brl(clt.vacationThirdNet)} />
            <Line label={C.out.fgts} value={brl(clt.fgts)} />
            <Line label={C.out.benefits} value={brl(clt.benefits)} />
            {clt.plr > 0 && <Line label={C.out.plr} value={brl(clt.plr)} />}
            <Line label={C.out.package} value={brl(clt.packageYear)} strong />
          </div>
        </section>
        <section className="card p-5" data-testid="calc-col-pj">
          <p className="font-display text-2xl text-ink">{C.pj}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{Field("pj", C.fields.invoice)}{Field("cont", C.fields.accountant)}{Field("saudepj", C.fields.healthPj)}{Field("meses", C.fields.months)}</div>
          <div className="mt-4 border-t border-edge pt-3">
            <Line label={C.out.monthlyNet} value={brl(pj.best.monthlyNet)} strong />
            <p className="text-xs text-muted">{C.out.annex(pj.best.annex, pj.best.rate)} — {pj.best.annex === "III" ? C.out.fatorR : C.out.noFatorR}</p>
            <Line label={C.out.das} value={brl(pj.best.das)} />
            <Line label={`${C.out.proLabore} (${brl(pj.best.proLabore)})`} value={`${brl(pj.best.inss)} + ${brl(pj.best.irrf)}`} />
            <Line label={C.out.costs} value={brl(pj.best.costs)} />
            <Line label={C.out.yearNet} value={brl(pj.netYear)} strong />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border-2 border-ink p-5" data-testid="calc-result">
        <p className="font-display text-2xl text-ink">{Math.abs(diff) < 1 ? C.out.equal : C.out.diff(brl(Math.abs(diff)), diff > 0 ? "PJ" : "CLT")}</p>
        <p className="mt-2 text-sm text-ink-2"><strong className="text-ink">{C.out.equivalent}: <span data-testid="calc-equivalent">{brl(equivalent)}</span></strong> — {C.out.equivalentHint(cltIn.gross ? Math.round(((equivalent - cltIn.gross) / cltIn.gross) * 100) : 0)}</p>
      </section>

      <section className="card p-5" data-testid="calc-ask">
        <p className="font-display text-2xl text-ink">{C.ask.title}</p>
        <p className="mt-1 text-sm text-ink-2">{C.ask.intro}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 sm:items-end">
          {Field("quero", C.ask.want)}
          <div><p className="text-xs text-muted">{C.ask.clt}</p><p className="font-display text-2xl text-ink" data-testid="calc-ask-clt">{brl(grossForNet(wantNet, cltIn.dependants))}</p></div>
          <div><p className="text-xs text-muted">{C.ask.pj}</p><p className="font-display text-2xl text-ink" data-testid="calc-ask-pj">{brl(invoiceForNet(wantNet, pjOpts))}</p></div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3 no-print">
        <button type="button" className="btn btn-ink !py-2 !text-sm" data-testid="calc-share" onClick={() => { void navigator.clipboard.writeText(window.location.href).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}>{copied ? C.shared : C.share}</button>
        <button type="button" className="btn btn-ghost !py-2 !text-sm" onClick={() => window.print()}>{C.print}</button>
      </div>
    </div>
  );
}
