"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { Badge, Button, Icon, Notice, Seal, Textarea, Token } from "@/components/ui";
import { ImportableTextarea } from "@/components/FileDrop";
import { atsCheck, decodeShare, encodeShare, wordCount, type AtsResult, type Check, type Lang } from "@/lib/ats/check";
import { ATS_COPY } from "./copy";
import { track } from "@/lib/client/track";

/** Search-facing copy: server-rendered in the route's language, then following the visitor's unless the route is localised. */
export function AtsSeo({ lang, forced, part }: { lang: Lang; forced: boolean; part: "head" | "faq" }) {
  const { lang: current, x } = useI18n();
  const c = ATS_COPY[forced ? lang : current];
  if (part === "head") {
    return (
      <div>
        <Seal>{c.badge}</Seal>
        <h1 className="doc-45 mt-[var(--s-6)] text-[color:var(--ink)] lg:text-[length:var(--doc-64)] lg:leading-[var(--doc-64-lh)] lg:tracking-[var(--doc-64-ls)]">{c.h1}</h1>
        <p className="doc-18 mt-[var(--s-6)] max-w-[var(--measure)] text-[color:var(--ink-2)]">{c.intro}</p>
        <ol className="mt-[var(--s-7)] grid border-t border-[var(--rule)] sm:grid-cols-3 sm:gap-x-[var(--gutter)]">
          {c.steps.map((s, i) => (
            <li key={i} className="flex gap-[var(--s-4)] border-b border-[var(--rule-hairline)] py-[var(--s-4)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">
              <span className="font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-40)]">{String(i + 1).padStart(2, "0")}</span>{s}
            </li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <section className="mt-[var(--s-12)]">
      <h2 className="doc-31 text-[color:var(--ink)]">{c.faqTitle}</h2>
      <div className="mt-[var(--s-6)] border-t border-[var(--rule)]">
        {c.faq.map((f) => (
          <details key={f.q} className="group border-b border-[var(--rule-hairline)] py-[var(--s-5)]">
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-[var(--s-5)] font-sans text-[length:var(--ui-15)] font-medium text-[color:var(--ink)]">
              {f.q}
              <span className="relative top-[3px] shrink-0 text-[color:var(--ink-muted)] group-open:hidden"><Icon name="plus" size={16} /></span>
              <span className="relative top-[3px] hidden shrink-0 text-[color:var(--ink-muted)] group-open:block"><Icon name="minus" size={16} /></span>
            </summary>
            <p className="mt-[var(--s-4)] max-w-[var(--measure)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">{f.a}</p>
          </details>
        ))}
      </div>
      <div className="mt-[var(--s-10)] bg-[var(--ink)] p-[var(--s-8)] text-[color:var(--on-ink)]">
        <p className="doc-31">{x.ats.cta.title}</p>
        <p className="mt-[var(--s-4)] max-w-[var(--measure)] font-sans text-[length:var(--ui-15)] leading-[var(--ui-15-lh)] opacity-80">{x.ats.cta.body}</p>
        <Link href="/start" className="mt-[var(--s-6)] inline-flex h-[var(--control-h)] items-center rounded-[var(--r-2)] bg-[var(--on-ink)] px-[var(--s-6)] font-sans text-[length:var(--ui-15)] font-semibold text-[color:var(--ink)] hover:opacity-90">{x.ats.cta.button}</Link>
      </div>
    </section>
  );
}

export function AtsChecker(props: { lang: Lang; forced: boolean }) {
  return <Suspense fallback={null}><Checker {...props} /></Suspense>;
}

/**
 * The tool itself. Everything runs in the browser: the pasted text never leaves the device, and
 * the share link carries only the score, the grade and the top three fixes.
 */
function Checker({ lang, forced }: { lang: Lang; forced: boolean }) {
  const { x, lang: current } = useI18n();
  const L = forced ? lang : current;
  const A = x.ats;
  const params = useSearchParams();
  const shared = useMemo(() => { const r = params.get("r"); return r ? decodeShare(r) : null; }, [params]);
  const [resume, setResume] = useState("");
  const [posting, setPosting] = useState("");
  const [result, setResult] = useState<AtsResult | null>(null);
  const [share, setShare] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function run() {
    if (wordCount(resume) < 20) { setError(A.tooShort); setResult(null); return; }
    setError(""); setCopied(false);
    const r = atsCheck(resume, posting, lang);
    track("ats_check_run", { score: r.score, posting: r.hasPosting });
    setResult(r);
    setShare(`${window.location.origin}${window.location.pathname}?r=${encodeShare(r, L)}`);
    setTimeout(() => document.getElementById("ats-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  async function copy() { try { await navigator.clipboard.writeText(share); setCopied(true); } catch {} }
  async function nativeShare() {
    if (!result) return;
    const n = navigator as Navigator & { share?: (d: { title: string; text: string; url: string }) => Promise<void> };
    if (n.share) { try { await n.share({ title: "ResumeTailor", text: A.share.text(result.score), url: share }); return; } catch {} }
    void copy();
  }
  function image() {
    if (!result) return;
    const c = document.createElement("canvas"); c.width = 1200; c.height = 630;
    const g = c.getContext("2d"); if (!g) return;
    g.fillStyle = "#f4efe6"; g.fillRect(0, 0, 1200, 630);
    g.fillStyle = "#8a2432"; g.fillRect(0, 0, 1200, 14);
    g.fillStyle = "#6f655b"; g.font = "600 26px Inter, Arial, sans-serif"; g.fillText(`RESUMETAILOR · ${A.scoreLabel.toUpperCase()}`, 80, 96);
    g.fillStyle = "#1b1713"; g.font = "700 210px Georgia, 'Times New Roman', serif"; g.fillText(String(result.score), 72, 330);
    g.fillStyle = "#6f655b"; g.font = "600 34px Inter, Arial, sans-serif"; g.fillText("/100", 72 + g.measureText(String(result.score)).width * 6.2, 330);
    g.fillStyle = "#8a2432"; g.font = "700 40px Inter, Arial, sans-serif"; g.fillText(A.grade[result.grade], 80, 410);
    g.fillStyle = "#3d3630"; g.font = "600 24px Inter, Arial, sans-serif"; g.fillText(A.fixes.toUpperCase(), 620, 200);
    g.font = "30px Inter, Arial, sans-serif";
    result.fixes.slice(0, 3).forEach((f, i) => g.fillText(`${i + 1}. ${A.checks[f.id].t}`, 620, 250 + i * 52));
    g.fillStyle = "#6f655b"; g.font = "24px Inter, Arial, sans-serif"; g.fillText(`${A.cardCta} · ${window.location.host}${window.location.pathname}`, 80, 570);
    c.toBlob((b) => { if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "ats-check.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, "image/png");
  }

  const detail = (c: Check): string => {
    const d = c.detail;
    switch (c.id) {
      case "contact": return [!d.email && A.details.email, !d.phone && !d.linkedin && A.details.phone].filter(Boolean).join(" · ");
      case "quantified": return A.details.quantified(d.quantified, d.bullets);
      case "bullets": return A.details.bullets(d.bullets);
      case "dates": return A.details.dates(d.mentions);
      case "length": return A.details.words(d.words);
      case "keywords": return A.details.keywords(d.matched, d.total);
      case "format_tables": return A.details.tableLines(d.lines);
      default: return "";
    }
  };
  const tips = L === "pt" ? A.gupy : A.tips;

  return (
    <div className="mt-10">
      {shared && (
        <div className="mb-[var(--s-7)] border-t-2 border-b border-[var(--ink)] py-[var(--s-6)]" data-testid="share-card">
          <p className="eyebrow">{A.cardFrom}</p>
          <div className="mt-3 flex flex-wrap items-center gap-6">
            <p className="font-mono text-[length:var(--mn-40)] font-medium tabular-nums leading-none text-[color:var(--ink)]">{shared.s}<span className="text-[length:var(--ui-15)] text-[color:var(--ink-muted)]">/100</span></p>
            <div>
              <Seal>{A.grade[shared.g]}</Seal>
              {shared.f.length > 0 && <ul className="mt-2 text-sm text-ink-2">{shared.f.map((id) => <li key={id}>· {A.checks[id].t}</li>)}</ul>}
              {shared.k !== null && <p className="mt-1 text-xs text-muted">{A.keywords.title}: {shared.k}%</p>}
            </div>
          </div>
          <p className="mt-[var(--s-5)] font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink-2)]">{A.cardCta}</p>
        </div>
      )}

      <div className="border border-[var(--rule)] p-[var(--s-6)] sm:p-[var(--s-8)]" data-tour="ats-check">
        <p className="eyebrow">{A.eyebrow}</p>
        <label htmlFor="ats-resume" className="mt-[var(--s-4)] block font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink-2)]">{A.resumeLabel}</label>
        <div className="mt-2"><ImportableTextarea id="ats-resume" value={resume} onChange={setResume} rows={12} placeholder={A.resumePh} testId="ats-resume" importTestId="import" tour="import" /></div>
        <label htmlFor="ats-posting" className="mt-[var(--s-6)] block font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink-2)]">{A.postingLabel}</label>
        <Textarea id="ats-posting" className="mt-[var(--s-3)]" rows={6} value={posting} onChange={(e) => setPosting(e.target.value)} placeholder={A.postingPh} data-testid="ats-posting" />
        <div className="mt-[var(--s-6)] flex flex-wrap items-center gap-[var(--s-5)]">
          <Button size="lg" onClick={run} data-testid="ats-check">{A.check}</Button>
          <p className="font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{A.privacy}</p>
        </div>
        {error && <Notice tone="mark" icon="flag" className="mt-[var(--s-4)]"><span data-testid="ats-error">{error}</span></Notice>}
      </div>

      {result && (
        <div id="ats-result" className="mt-[var(--s-8)] scroll-mt-24 border-t-2 border-[var(--ink)] pt-[var(--s-7)]" data-testid="ats-result">
          <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div>
              <p className="font-mono text-[length:var(--mn-40)] font-medium tabular-nums leading-none text-[color:var(--ink)]"><span data-testid="ats-score">{result.score}</span><span className="text-[length:var(--ui-17)] text-[color:var(--ink-muted)]">/100</span></p>
              <p className="eyebrow mt-[var(--s-3)]">{A.scoreLabel}</p>
            </div>
            <div>
              <Seal>{A.grade[result.grade]}</Seal>
              <p className="mt-3 text-ink-2" data-testid="ats-grade" data-grade={result.grade}>{A.gradeText[result.grade]}</p>
              <p className="mt-2 text-xs text-muted">
                {result.stats.words} {A.stats.words} · {result.stats.bullets} {A.stats.bullets} · {result.stats.quantified} {A.stats.quantified} · {result.stats.dateMentions} {A.stats.dates}
              </p>
            </div>
          </div>

          <p className="eyebrow mt-8">{A.fixes}</p>
          {result.fixes.length === 0 ? <p className="mt-2 text-sm text-moss">{A.allGood}</p> : (
            <ol className="mt-3 space-y-3">
              {result.fixes.map((f, i) => (
                <li key={f.id} className="border-b border-[var(--rule-hairline)] py-[var(--s-4)]" data-testid="ats-fix" data-check={f.id}>
                  <div className="flex flex-wrap items-baseline gap-x-[var(--s-4)] gap-y-[var(--s-2)]">
                    <span className="font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-40)]">{String(i + 1).padStart(2, "0")}</span>
                    <p className="font-sans text-[length:var(--ui-15)] font-semibold text-[color:var(--ink)]">{A.checks[f.id].t}</p>
                    <Badge tone={f.severity === "high" ? "mark" : f.severity === "medium" ? "query" : "neutral"}>{A.severity[f.severity]}</Badge>
                    <span className="ml-auto font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--kept)]">+{f.gain}</span>
                  </div>
                  <p className="mt-[var(--s-2)] max-w-[var(--measure)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">{A.checks[f.id].fix}</p>
                  {detail(f) && <p className="mt-[var(--s-2)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{detail(f)}</p>}
                </li>
              ))}
            </ol>
          )}

          <p className="eyebrow mt-8">{A.keywords.title}</p>
          {result.hasPosting ? (
            <div className="mt-2 space-y-3">
              <p className="text-sm text-ink-2">{A.keywords.coverage(result.keywords.coverage ?? 0)}</p>
              {result.keywords.matched.length > 0 && <div className="flex flex-wrap gap-[var(--s-2)]" data-testid="kw-matched">{result.keywords.matched.map((k) => <Token key={k} state="kept">{k}</Token>)}</div>}
              {result.keywords.missing.length > 0 && <div className="flex flex-wrap gap-[var(--s-2)]" data-testid="kw-missing">{result.keywords.missing.map((k) => <Token key={k} state="missing">{k}</Token>)}</div>}
              <p className="text-xs text-muted">{A.keywords.honest}</p>
            </div>
          ) : <p className="mt-2 text-sm text-muted">{A.keywords.none}</p>}

          <details className="mt-8">
            <summary className="eyebrow cursor-pointer">{A.checksTitle} ({result.checks.filter((c) => c.ok).length}/{result.checks.length})</summary>
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {result.checks.map((c) => <li key={c.id} className="flex items-center gap-2 text-sm" data-testid="ats-check-row" data-check={c.id} data-ok={c.ok ? "1" : "0"}><span style={{ color: c.ok ? "var(--kept)" : "var(--mark)" }}><Icon name={c.ok ? "check" : "close"} size={16} /></span><span className="text-ink-2">{A.checks[c.id].t}</span><span className="ml-auto text-xs text-muted">{c.earned}/{c.max}</span></li>)}
            </ul>
          </details>

          <div className="mt-[var(--s-9)] bg-[var(--sunken)] p-[var(--s-6)]" data-testid="ats-tips">
            <p className="font-sans text-[length:var(--ui-15)] font-semibold text-[color:var(--ink)]">{tips.title}</p>
            <ul className="mt-[var(--s-3)] flex flex-col">{tips.items.map((t) => <li key={t} className="flex items-start gap-[var(--s-4)] border-b border-[var(--rule-hairline)] py-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)] last:border-0"><span aria-hidden className="mt-[10px] h-px w-[10px] shrink-0 bg-[var(--rule-field)]" />{t}</li>)}</ul>
          </div>

          <div className="mt-8 border-t border-edge pt-6">
            <p className="eyebrow">{A.share.title}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input readOnly className="field min-w-0 flex-1 font-mono text-[length:var(--mn-13)]" value={share} onFocus={(e) => e.currentTarget.select()} data-testid="share-url" aria-label={A.share.title} />
              <Button variant="outline" size="sm" icon="copy" onClick={copy} data-testid="share-copy">{copied ? A.share.copied : A.share.copy}</Button>
              <Button size="sm" onClick={nativeShare}>{A.share.native}</Button>
              <Button variant="outline" size="sm" onClick={image} data-testid="share-image">{A.share.image}</Button>
            </div>
          </div>

          <div className="mt-[var(--s-9)] border-t border-[var(--rule)] pt-[var(--s-6)]" data-testid="ats-cta">
            <p className="doc-26 text-[color:var(--ink)]">{A.cta.title}</p>
            <p className="mt-[var(--s-3)] max-w-[var(--measure)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">{A.cta.body}</p>
            <Button href="/start" className="mt-[var(--s-5)]">{A.cta.button}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
