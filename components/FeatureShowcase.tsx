"use client";

import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { FeatureKey } from "@/app/i18n/r3/showcase";
import { Badge, Icon, Token } from "@/components/ui";

const FREE: FeatureKey[] = ["match", "meter", "fit", "voice", "tracker", "calculator", "compare", "codes", "ats"];
export const isFree = (k: FeatureKey) => FREE.includes(k);

const bar = (w: number, colour = "var(--ink)") => (
  <span className="block h-[3px] w-full bg-[var(--sunken)]">
    <span className="block h-full" style={{ width: `${w}%`, background: colour }} />
  </span>
);
const num = (v: string, colour = "var(--ink)") => (
  <span className="font-mono text-[length:var(--mn-24)] font-medium tabular-nums leading-none" style={{ color: colour }}>{v}</span>
);
const micro = (t: string) => <span className="font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{t}</span>;

/**
 * A small true picture of each tool (docs/DESIGN.md §9.4) — HTML, not a screenshot, so it follows
 * the theme and the language. Rebuilt on the system: the thirteen emoji, the six colour washes and
 * the pill chips are gone; what is left is mono for machine numbers, the token's state edge, and
 * one hairline bar. Nothing here invents a colour the rest of the product does not use.
 */
function Visual({ k, lang }: { k: FeatureKey; lang: string }) {
  const pt = lang === "pt";
  switch (k) {
    case "match":
      return (
        <div className="flex items-baseline gap-[var(--s-3)]">
          {num("41", "var(--ink-muted)")}<Icon name="arrow-right" size={16} className="text-[color:var(--ink-40)]" />{num("89", "var(--kept)")}
        </div>
      );
    case "meter":
      return <div className="space-y-[var(--s-2)]">{bar(45, "var(--ink-40)")}{bar(78, "var(--kept)")}{micro("45% → 78%")}</div>;
    case "fit":
      return (
        <ul className="space-y-[2px] font-sans text-[length:var(--ui-12)]">
          <li className="flex items-center gap-[var(--s-2)] text-[color:var(--kept)]"><Icon name="check" size={16} />SQL</li>
          <li className="flex items-center gap-[var(--s-2)] text-[color:var(--query)]"><Icon name="minus" size={16} />Power BI</li>
          <li className="flex items-center gap-[var(--s-2)] text-[color:var(--mark)]"><Icon name="close" size={16} />Salesforce</li>
        </ul>
      );
    case "truth":
      return (
        <div className="flex flex-wrap gap-[var(--s-2)]">
          <Token state="kept">38%</Token><Token state="kept">Acme</Token><Token state="partial">{pt ? "6 anos" : "6 years"}</Token>
        </div>
      );
    case "human":
      return (
        <div className="flex items-baseline gap-[var(--s-3)]">
          {num("92", "var(--kept)")}
          <span className="font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)] line-through decoration-[var(--mark)]">{pt ? "proativo e dinâmico" : "results-driven"}</span>
        </div>
      );
    case "numbers":
      return (
        <div className="space-y-[var(--s-2)] font-sans text-[length:var(--ui-12)]">
          <p className="w-fit rounded-[var(--r-1)] bg-[var(--sunken)] px-[var(--s-3)] py-[2px] text-[color:var(--ink-2)]">{pt ? "Quantos clientes por dia?" : "How many customers a day?"}</p>
          <p className="ml-auto w-fit rounded-[var(--r-1)] bg-[var(--ink)] px-[var(--s-3)] py-[2px] font-mono text-[color:var(--on-ink)]">25</p>
        </div>
      );
    case "editor":
      return (
        <div className="flex items-center gap-[var(--s-3)]">
          <span className="flex-1 space-y-[var(--s-2)]">{bar(80, "var(--rule-field)")}{bar(60, "var(--rule-field)")}{bar(70, "var(--rule-field)")}</span>
          <Token>.docx</Token>
        </div>
      );
    case "voice":
      return (
        <div className="flex h-8 items-end gap-[2px]" aria-hidden>
          {[3, 6, 9, 5, 8, 4, 7, 10, 6, 3, 5].map((h, i) => <span key={i} className="w-[3px] bg-[var(--ink-2)]" style={{ height: `${h * 3}px` }} />)}
        </div>
      );
    case "interview":
      return <div className="flex items-baseline gap-[var(--s-3)]">{num("8.4")}{micro(pt ? "ritmo bom · 2 “né”" : "good pace · 2 “um”")}</div>;
    case "pitch":
      return (
        <div className="rounded-[var(--r-1)] bg-[var(--ink)] px-[var(--s-3)] py-[var(--s-2)] font-sans text-[length:var(--ui-12)] leading-tight text-[color:var(--on-ink)]">
          <p className="opacity-55">{pt ? "Oi, eu sou a Ana…" : "Hi, I'm Ana…"}</p>
          <p>{pt ? "Aumentei a retenção em 12%" : "I grew retention 12%"}</p>
          <p className="mt-[var(--s-2)] text-right font-mono tabular-nums opacity-70">0:58</p>
        </div>
      );
    case "tracker":
      return (
        <div className="space-y-[var(--s-2)]">
          <div className="grid grid-cols-3 gap-[var(--s-2)]">
            {[2, 1, 1].map((n, i) => (
              <div key={i} className="space-y-[2px] bg-[var(--sunken)] p-[var(--s-2)]">
                {Array.from({ length: n }, (_, j) => <div key={j} className="h-[3px] bg-[var(--rule-field)]" />)}
              </div>
            ))}
          </div>
          <Badge tone="query">{pt ? "follow-up" : "follow up"}</Badge>
        </div>
      );
    case "webcv":
      return (
        <div className="mx-auto h-12 w-9 border border-[var(--ink)] p-[3px]">
          <div className="h-[3px] bg-[var(--ink)]" />
          <div className="mt-[3px] space-y-[2px]">{[1, 2, 3].map((i) => <div key={i} className="h-[2px] bg-[var(--rule-field)]" />)}</div>
        </div>
      );
    case "letters":
      return (
        <div className="flex flex-wrap gap-[var(--s-2)] font-sans text-[length:var(--ui-12)]">
          {(pt ? ["formal", "calorosa", "direta", "confiante"] : ["formal", "warm", "direct", "confident"]).map((t, i) => (
            <span key={t} className={i === 2 ? "rounded-[var(--r-1)] bg-[var(--ink)] px-[var(--s-2)] text-[color:var(--on-ink)]" : "rounded-[var(--r-1)] bg-[var(--sunken)] px-[var(--s-2)] text-[color:var(--ink-2)]"}>{t}</span>
          ))}
        </div>
      );
    case "linkedin":
      return (
        <div className="flex items-center gap-[var(--s-3)]">
          <span className="bg-[var(--ink)] px-[var(--s-2)] font-sans text-[length:var(--ui-12)] font-bold text-[color:var(--on-ink)]">in</span>
          <span className="flex-1">{bar(82, "var(--kept)")}</span>
          <span className="font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-muted)]">82%</span>
        </div>
      );
    case "calculator":
      // The money a person is paid is set in the document face, not in the machine's.
      return (
        <div className="flex justify-between gap-[var(--s-4)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">
          <span>CLT <b className="block font-serif text-[length:var(--doc-21)] font-semibold text-[color:var(--ink)]">R$ 6.100</b></span>
          <span>PJ <b className="block font-serif text-[length:var(--doc-21)] font-semibold text-[color:var(--kept)]">R$ 8.900</b></span>
        </div>
      );
    case "compare":
      return (
        <ol className="space-y-[2px] font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-2)]">
          <li>1 · 86</li>
          <li>2 · 71</li>
          <li className="flex items-center gap-[var(--s-2)] text-[color:var(--mark)]"><Icon name="flag" size={16} />3 · {pt ? "golpe" : "scam"}</li>
        </ol>
      );
    case "intl":
      return (
        <div className="flex flex-wrap items-center gap-[var(--s-2)] font-sans text-[length:var(--ui-12)]">
          <span className="rounded-[var(--r-1)] bg-[var(--ink)] px-[var(--s-2)] text-[color:var(--on-ink)]">EN</span>
          <span className="rounded-[var(--r-1)] bg-[var(--sunken)] px-[var(--s-2)] text-[color:var(--ink-2)]">ES</span>
          <Token state="kept">{pt ? "sem CPF" : "no ID"}</Token>
        </div>
      );
    case "codes":
      return <div className="w-fit border border-dashed border-[var(--rule-field)] px-[var(--s-3)] py-[2px] font-mono text-[length:var(--mn-13)] text-[color:var(--ink-2)]">UNI-2026 · +1</div>;
    case "ats":
      return (
        <div className="flex items-center gap-[var(--s-3)]">
          <span className="grid h-10 w-10 place-items-center border border-[var(--ink)] font-mono text-[length:var(--mn-15)] font-medium tabular-nums text-[color:var(--ink)]">84</span>
          {micro("Workday · Gupy · Greenhouse")}
        </div>
      );
  }
}

/**
 * The feature list. Every item used to be an identical bordered card in a three-up grid — the
 * shape this system exists to stop. It is now a ruled list on two columns: the rule does the
 * separating, the badge says free or in-the-kit, and the picture sits in its own narrow column so
 * the titles all start on the same baseline.
 */
export function FeatureShowcase({ keys, links, testId = "showcase" }: { keys: FeatureKey[]; links?: Partial<Record<FeatureKey, string>>; testId?: string }) {
  const { r, lang } = useI18n();
  const S = r.showcase;
  const shown = keys.filter((k) => k !== "calculator" || lang === "pt");
  return (
    <ul className="grid border-t border-[var(--rule)] md:grid-cols-2 md:gap-x-[var(--gutter)]" data-testid={testId}>
      {shown.map((k) => {
        const body = (
          <div className="flex items-start gap-[var(--s-6)] py-[var(--s-6)]">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-[var(--s-4)]">
                <p className="font-sans text-[length:var(--ui-15)] font-semibold text-[color:var(--ink)]">{S.cards[k].t}</p>
                <Badge tone={isFree(k) ? "kept" : "neutral"}>{isFree(k) ? S.free : S.kit}</Badge>
              </div>
              <p className="mt-[var(--s-2)] max-w-[52ch] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{S.cards[k].d}</p>
            </div>
            <div className="hidden w-[136px] shrink-0 sm:block" aria-hidden><Visual k={k} lang={lang} /></div>
          </div>
        );
        const href = links?.[k];
        return (
          <li key={k} className="border-b border-[var(--rule-hairline)]" data-testid="showcase-card" data-feature={k}>
            {href ? (
              <Link href={href as never} className="block transition-colors hover:bg-[var(--sunken)]" data-testid="showcase-link">{body}</Link>
            ) : body}
          </li>
        );
      })}
    </ul>
  );
}
