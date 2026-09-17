"use client";

import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { FeatureKey } from "@/app/i18n/r3/showcase";

const FREE: FeatureKey[] = ["match", "meter", "fit", "voice", "tracker", "calculator", "compare", "codes", "ats"];
export const isFree = (k: FeatureKey) => FREE.includes(k);

/** Tiny HTML/CSS pictures of each tool — no screenshots, so they follow the theme and the language. */
function Visual({ k, lang }: { k: FeatureKey; lang: string }) {
  const pt = lang === "pt";
  const bar = (w: number, cls = "bg-oxblood") => <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2"><div className={`h-full ${cls}`} style={{ width: `${w}%` }} /></div>;
  const chip = (t: string, cls = "bg-paper-2 text-ink-2") => <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{t}</span>;
  switch (k) {
    case "match": return <div className="flex items-end gap-2 font-display"><span className="text-2xl text-muted">41</span><span className="text-gold">→</span><span className="text-4xl text-moss">89</span>{bar(89, "bg-moss")}</div>;
    case "meter": return <div className="space-y-1.5">{bar(45)}{bar(78, "bg-moss")}<p className="text-[10px] text-muted">45% → 78%</p></div>;
    case "fit": return <ul className="space-y-1 text-[11px]"><li className="text-moss">✓ SQL</li><li className="text-gold">◐ Power BI</li><li className="text-oxblood">✕ Salesforce</li></ul>;
    case "truth": return <div className="flex flex-wrap gap-1">{chip("38% ✓", "bg-moss-2 text-moss")}{chip("Acme ✓", "bg-moss-2 text-moss")}{chip(pt ? "6 anos ?" : "6 years ?", "bg-gold-2 text-ink")}</div>;
    case "human": return <div className="flex items-center gap-2"><span className="font-display text-2xl text-moss">92</span><span className="text-[11px] text-muted line-through decoration-oxblood">{pt ? "proativo e dinâmico" : "results-driven"}</span></div>;
    case "numbers": return <div className="space-y-1 text-[11px]"><p className="w-fit rounded-lg rounded-bl-none bg-paper-2 px-2 py-1 text-ink-2">{pt ? "Quantos clientes por dia?" : "How many customers a day?"}</p><p className="ml-auto w-fit rounded-lg rounded-br-none bg-ink px-2 py-1 text-paper">25</p></div>;
    case "editor": return <div className="flex items-center gap-2"><div className="flex-1 space-y-1">{[80, 60, 70].map((w) => <div key={w} className="h-1.5 rounded bg-edge-2" style={{ width: `${w}%` }} />)}</div>{chip("W .docx", "bg-ink text-paper")}{chip(pt ? "Copiar" : "Copy")}</div>;
    case "voice": return <div className="flex h-8 items-end gap-0.5">{[3, 6, 9, 5, 8, 4, 7, 10, 6, 3, 5].map((h, i) => <span key={i} className="w-1.5 rounded bg-oxblood" style={{ height: `${h * 3}px` }} />)}</div>;
    case "interview": return <div className="flex items-center gap-2"><span className="font-display text-3xl text-ink">8.4</span><span className="text-[11px] text-muted">{pt ? "ritmo bom · 2 “né”" : "good pace · 2 “um”"}</span></div>;
    case "pitch": return <div className="rounded-lg bg-ink px-2 py-1.5 text-[10px] leading-tight text-paper"><p className="opacity-50">{pt ? "Oi, eu sou a Ana…" : "Hi, I'm Ana…"}</p><p>{pt ? "Aumentei a retenção em 12%" : "I grew retention 12%"}</p><p className="mt-1 text-right font-display text-gold">0:58</p></div>;
    case "tracker": return <div className="space-y-1"><div className="grid grid-cols-3 gap-1">{[2, 1, 1].map((n, i) => <div key={i} className="space-y-0.5 rounded bg-paper-2 p-1">{Array.from({ length: n }, (_, j) => <div key={j} className="h-1.5 rounded bg-edge-2" />)}</div>)}</div>{chip(pt ? "📡 Hora do follow-up" : "📡 Time to follow up", "bg-gold-2 text-ink")}</div>;
    case "webcv": return <div className="mx-auto h-12 w-8 rounded-md border-2 border-ink p-0.5"><div className="h-1 rounded bg-ink" /><div className="mt-1 space-y-0.5">{[1, 2, 3].map((i) => <div key={i} className="h-0.5 rounded bg-edge-2" />)}</div></div>;
    case "letters": return <div className="flex flex-wrap gap-1">{(pt ? ["formal", "calorosa", "direta", "confiante"] : ["formal", "warm", "direct", "confident"]).map((t, i) => chip(t, i === 2 ? "bg-ink text-paper" : undefined))}</div>;
    case "linkedin": return <div className="flex items-center gap-2"><span className="rounded bg-ink px-1.5 text-xs font-bold text-paper">in</span>{bar(82, "bg-moss")}<span className="text-[10px] text-muted">82%</span></div>;
    case "calculator": return <div className="flex justify-between text-[11px]"><span>CLT <b className="font-display text-base text-ink">R$ 6.1k</b></span><span>PJ <b className="font-display text-base text-moss">R$ 8.9k</b></span></div>;
    case "compare": return <ol className="space-y-0.5 text-[11px]"><li>1 · 86</li><li>2 · 71</li><li className="text-oxblood">3 · ⚠ {pt ? "cara de golpe" : "looks like a scam"}</li></ol>;
    case "intl": return <div className="flex flex-wrap gap-1">{chip("EN", "bg-ink text-paper")}{chip("ES")}{chip(pt ? "sem CPF" : "no ID", "bg-moss-2 text-moss")}</div>;
    case "codes": return <div className="w-fit rounded border border-dashed border-ink px-2 py-1 font-mono text-xs text-ink">UNI-2026 · +1</div>;
    case "ats": return <div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-full border-4 border-moss font-display text-sm text-ink">84</span><span className="text-[11px] text-muted">Workday · Gupy · Greenhouse</span></div>;
  }
}

/**
 * The feature cards: title, one line, a free / in-the-kit badge and a small picture. Rendered on
 * the server too (the landing pages' HTML carries them). `links` turns each card into a link.
 */
export function FeatureShowcase({ keys, links, testId = "showcase" }: { keys: FeatureKey[]; links?: Partial<Record<FeatureKey, string>>; testId?: string }) {
  const { r, lang } = useI18n();
  const S = r.showcase;
  const shown = keys.filter((k) => k !== "calculator" || lang === "pt");
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid={testId}>
      {shown.map((k) => {
        const body = (
          <>
            <div className="min-h-12"><Visual k={k} lang={lang} /></div>
            <div className="mt-3 flex items-start justify-between gap-2">
              <p className="font-semibold text-ink">{S.cards[k].t}</p>
              <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " + (isFree(k) ? "bg-moss-2 text-moss" : "bg-gold-2 text-ink")}>{isFree(k) ? S.free : S.kit}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{S.cards[k].d}</p>
          </>
        );
        const href = links?.[k];
        return (
          <li key={k} className="card p-5" data-testid="showcase-card" data-feature={k}>
            {href ? <Link href={href} className="block" data-testid="showcase-link">{body}</Link> : body}
          </li>
        );
      })}
    </ul>
  );
}
