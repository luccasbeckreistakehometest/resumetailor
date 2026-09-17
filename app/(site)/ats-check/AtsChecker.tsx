"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { Eyebrow, Stamp } from "@/components/ui";
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
        <Stamp>{c.badge}</Stamp>
        <h1 className="font-display mt-5 text-[2.6rem] leading-[1.02] tracking-[-0.02em] text-ink sm:text-6xl">{c.h1}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">{c.intro}</p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-3">
          {c.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-ink-2"><span className="font-display text-3xl leading-none text-edge-2">{i + 1}</span>{s}</li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <section className="mt-16">
      <h2 className="font-display text-3xl text-ink">{c.faqTitle}</h2>
      <div className="mt-4 divide-y divide-edge">
        {c.faq.map((f) => (
          <details key={f.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">{f.q}<span className="text-muted transition group-open:rotate-45">+</span></summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{f.a}</p>
          </details>
        ))}
      </div>
      <div className="mt-10 rounded-2xl bg-ink p-8 text-paper">
        <p className="font-display text-3xl">{x.ats.cta.title}</p>
        <p className="mt-2 max-w-2xl text-paper-2/85">{x.ats.cta.body}</p>
        <Link href="/start" className="btn btn-primary mt-6">{x.ats.cta.button}</Link>
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
        <div className="card mb-6 border-2 !border-ink p-6" data-testid="share-card">
          <Eyebrow>{A.cardFrom}</Eyebrow>
          <div className="mt-3 flex flex-wrap items-center gap-6">
            <p className="font-display text-6xl leading-none text-ink">{shared.s}<span className="text-lg text-muted">/100</span></p>
            <div>
              <Stamp>{A.grade[shared.g]}</Stamp>
              {shared.f.length > 0 && <ul className="mt-2 text-sm text-ink-2">{shared.f.map((id) => <li key={id}>· {A.checks[id].t}</li>)}</ul>}
              {shared.k !== null && <p className="mt-1 text-xs text-muted">{A.keywords.title}: {shared.k}%</p>}
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-oxblood">↓ {A.cardCta}</p>
        </div>
      )}

      <div className="card p-6 sm:p-8" data-tour="ats-check">
        <Eyebrow>{A.eyebrow}</Eyebrow>
        <label htmlFor="ats-resume" className="mt-3 block text-sm font-medium text-ink-2">{A.resumeLabel}</label>
        <div className="mt-2"><ImportableTextarea id="ats-resume" value={resume} onChange={setResume} rows={12} placeholder={A.resumePh} testId="ats-resume" importTestId="import" tour="import" /></div>
        <label htmlFor="ats-posting" className="mt-5 block text-sm font-medium text-ink-2">{A.postingLabel}</label>
        <textarea id="ats-posting" className="field mt-2" rows={6} value={posting} onChange={(e) => setPosting(e.target.value)} placeholder={A.postingPh} data-testid="ats-posting" />
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button onClick={run} className="btn btn-primary" data-testid="ats-check">{A.check}</button>
          <p className="text-xs text-muted">{A.privacy}</p>
        </div>
        {error && <p className="mt-3 text-sm text-oxblood" role="alert" data-testid="ats-error">{error}</p>}
      </div>

      {result && (
        <div id="ats-result" className="card mt-6 scroll-mt-24 p-6 sm:p-8" data-testid="ats-result">
          <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="text-center">
              <p className="font-display text-8xl leading-none text-ink" data-testid="ats-score">{result.score}</p>
              <p className="eyebrow mt-2">{A.scoreLabel} / 100</p>
            </div>
            <div>
              <Stamp>{A.grade[result.grade]}</Stamp>
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
                <li key={f.id} className="rounded-xl border border-edge bg-paper p-4" data-testid="ats-fix" data-check={f.id}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-display text-2xl leading-none text-oxblood">{i + 1}</span>
                    <p className="font-semibold text-ink">{A.checks[f.id].t}</p>
                    <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide " + (f.severity === "high" ? "bg-oxblood/10 text-oxblood" : f.severity === "medium" ? "bg-gold-2 text-ink" : "bg-paper-2 text-muted")}>{A.severity[f.severity]}</span>
                    <span className="ml-auto text-xs font-semibold text-moss">+{f.gain}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-2">{A.checks[f.id].fix}</p>
                  {detail(f) && <p className="mt-1 text-xs text-muted">{detail(f)}</p>}
                </li>
              ))}
            </ol>
          )}

          <p className="eyebrow mt-8">{A.keywords.title}</p>
          {result.hasPosting ? (
            <div className="mt-2 space-y-3">
              <p className="text-sm text-ink-2">{A.keywords.coverage(result.keywords.coverage ?? 0)}</p>
              {result.keywords.matched.length > 0 && <div className="flex flex-wrap gap-1.5" data-testid="kw-matched">{result.keywords.matched.map((k) => <span key={k} className="rounded-full bg-moss-2 px-2.5 py-1 text-xs font-medium text-moss ring-1 ring-moss/30">✓ {k}</span>)}</div>}
              {result.keywords.missing.length > 0 && <div className="flex flex-wrap gap-1.5" data-testid="kw-missing">{result.keywords.missing.map((k) => <span key={k} className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-oxblood ring-1 ring-oxblood/30">+ {k}</span>)}</div>}
              <p className="text-xs text-muted">{A.keywords.honest}</p>
            </div>
          ) : <p className="mt-2 text-sm text-muted">{A.keywords.none}</p>}

          <details className="mt-8">
            <summary className="eyebrow cursor-pointer">{A.checksTitle} ({result.checks.filter((c) => c.ok).length}/{result.checks.length})</summary>
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {result.checks.map((c) => <li key={c.id} className="flex items-center gap-2 text-sm" data-testid="ats-check-row" data-check={c.id} data-ok={c.ok ? "1" : "0"}><span className={c.ok ? "text-moss" : "text-oxblood"}>{c.ok ? "✓" : "✕"}</span><span className="text-ink-2">{A.checks[c.id].t}</span><span className="ml-auto text-xs text-muted">{c.earned}/{c.max}</span></li>)}
            </ul>
          </details>

          <div className="mt-8 rounded-xl bg-gold-2 p-5" data-testid="ats-tips">
            <p className="font-semibold text-ink">{tips.title}</p>
            <ul className="mt-2 space-y-1.5">{tips.items.map((t) => <li key={t} className="flex gap-2 text-sm text-ink-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{t}</li>)}</ul>
          </div>

          <div className="mt-8 border-t border-edge pt-6">
            <p className="eyebrow">{A.share.title}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input readOnly className="field min-w-0 flex-1 !py-2 !text-xs" value={share} onFocus={(e) => e.currentTarget.select()} data-testid="share-url" aria-label={A.share.title} />
              <button onClick={copy} className="btn btn-ghost !py-2 !text-sm" data-testid="share-copy">{copied ? A.share.copied : A.share.copy}</button>
              <button onClick={nativeShare} className="btn btn-ink !py-2 !text-sm">{A.share.native}</button>
              <button onClick={image} className="btn btn-ghost !py-2 !text-sm" data-testid="share-image">{A.share.image}</button>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-dashed border-edge-2 bg-paper p-5" data-testid="ats-cta">
            <p className="font-display text-2xl text-ink">{A.cta.title}</p>
            <p className="mt-1 text-sm text-ink-2">{A.cta.body}</p>
            <Link href="/start" className="btn btn-primary mt-4">{A.cta.button}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
