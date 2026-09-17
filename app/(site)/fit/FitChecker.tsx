"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RedFlagNotice } from "@/components/RedFlagNotice";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { ImportableTextarea } from "@/components/FileDrop";
import { Eyebrow, Stamp } from "@/components/ui";
import type { FitView } from "@/lib/server/fit";
import type { FitItem } from "@/lib/fit/logic";

type Inputs = { targetRole: string; posting: string; resume: string };
const MIN = 30;

export function FitChecker() {
  const { x, lang, l } = useI18n();
  const F = x.fit;
  const router = useRouter();
  const [posting, setPosting] = useState("");
  const [resume, setResume] = useState("");
  const [last, setLast] = useState<Inputs | null>(null);
  const [result, setResult] = useState<FitView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/fit/inputs", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (j.inputs) setLast(j.inputs); }).catch(() => {});
  }, []);

  async function run() {
    if (posting.trim().length < MIN || resume.trim().length < MIN) { setError(F.tooShort); return; }
    setError(""); setLimit(null); setBusy(true);
    const r = await fetch("/api/fit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ posting, resume, lang }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.status === 429 && j.error === "limit") { setLimit(j.resetsAt ?? ""); return; }
    if (!r.ok) { setError(apiErrorText(j, l, x.errors.generic)); return; }
    setResult(j);
    setTimeout(() => document.getElementById("fit-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  /** The posting and the résumé travel to /start in sessionStorage — same device, no server hop, no URL bloat. */
  function makeKit() {
    if (!result) return;
    try { sessionStorage.setItem("rt_fit_carry", JSON.stringify({ role: result.role, posting, resume })); } catch {}
    router.push("/start?from=fit");
  }

  const when = (iso: string) => { try { return new Date(iso).toLocaleTimeString(lang === "pt" ? "pt-BR" : lang, { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

  return (
    <div>
      <Stamp>{F.badge}</Stamp>
      <h1 className="font-display mt-5 text-[2.6rem] leading-[1.02] tracking-[-0.02em] text-ink sm:text-6xl">{F.title}</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">{F.intro}</p>

      <div className="card mt-10 p-6 sm:p-8" data-tour="fit" data-testid="fit-form">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>{F.eyebrow}</Eyebrow>
          {last && <button onClick={() => { setPosting(last.posting); setResume(last.resume); }} className="text-sm font-medium text-oxblood underline-offset-4 hover:underline" data-testid="fit-reuse">↺ {F.reuse}</button>}
        </div>
        <label htmlFor="fit-posting" className="mt-3 block text-sm font-medium text-ink-2">{F.postingLabel}</label>
        <textarea id="fit-posting" className="field mt-2" rows={7} value={posting} onChange={(e) => setPosting(e.target.value)} placeholder={F.postingPh} data-testid="fit-posting" />
        <RedFlagNotice text={posting} />
        <label htmlFor="fit-resume" className="mt-5 block text-sm font-medium text-ink-2">{F.resumeLabel}</label>
        <div className="mt-2"><ImportableTextarea id="fit-resume" value={resume} onChange={setResume} rows={9} placeholder={F.resumePh} testId="fit-resume" importTestId="import" /></div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button onClick={run} disabled={busy} className="btn btn-primary" data-testid="fit-run">{busy ? F.running : F.run}</button>
          <p className="text-xs text-muted">{F.privacy}</p>
        </div>
        {error && <p className="mt-3 text-sm text-oxblood" role="alert" data-testid="fit-error">{error}</p>}
        {limit !== null && <p className="mt-3 rounded-xl bg-gold-2 px-4 py-3 text-sm text-ink" role="alert" data-testid="fit-limit">{F.limit}{limit ? ` ${F.limitUntil(when(limit))}` : ""}</p>}
      </div>

      {result && (
        <div id="fit-result" className="card mt-6 scroll-mt-24 p-6 sm:p-8" data-testid="fit-result" data-verdict={result.verdict}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Eyebrow>{result.role || F.roleFallback}</Eyebrow>
            <div className="flex items-center gap-2 text-xs text-muted">
              {result.cached && <span className="rounded-full bg-paper px-2.5 py-1 font-medium ring-1 ring-edge" data-testid="fit-cached">{F.cached}</span>}
              <span data-testid="fit-runs-left">{F.runsLeft(result.runsLeft)}</span>
            </div>
          </div>
          <div className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <Gauge score={result.score} label={F.scoreLabel} />
            <div>
              <Stamp>{F.verdict[result.verdict]}</Stamp>
              <p className="mt-3 text-ink-2" data-testid="fit-verdict">{F.verdictText[result.verdict]}</p>
              <p className="mt-2 text-sm text-ink" data-testid="fit-summary">{result.summary}</p>
            </div>
          </div>

          <p className="eyebrow mt-8">{F.gaps}</p>
          {result.gaps.length === 0 ? <p className="mt-2 text-sm text-moss" data-testid="fit-no-gaps">{F.noGaps}</p> : (
            <ol className="mt-3 space-y-3">
              {result.gaps.map((g, i) => (
                <li key={g.requirement} className="rounded-xl border border-edge bg-paper p-4" data-testid="fit-gap">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-display text-2xl leading-none text-oxblood">{i + 1}</span>
                    <p className="font-semibold text-ink">{g.requirement}</p>
                    <StatusChip item={g} labels={F.status} />
                    <span className="ml-auto text-[11px] uppercase tracking-wide text-muted">{F.weight[g.weight]}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-2">{g.advice}</p>
                </li>
              ))}
            </ol>
          )}

          <p className="eyebrow mt-8">{F.requirements}</p>
          <ul className="mt-3 divide-y divide-edge">
            {result.items.map((it) => (
              <li key={it.requirement} className="py-3" data-testid="fit-item" data-status={it.status}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusChip item={it} labels={F.status} />
                  <p className="font-medium text-ink">{it.requirement}</p>
                  <span className="ml-auto text-[11px] uppercase tracking-wide text-muted">{F.weight[it.weight]}</span>
                </div>
                {it.evidence ? <p className="mt-1 border-l-2 border-edge-2 pl-3 text-sm italic text-ink-2" data-testid="fit-evidence">“{it.evidence}”</p> : <p className="mt-1 text-xs text-muted">{F.noEvidence}</p>}
                <p className="mt-1 text-sm text-ink-2">{it.advice}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">{F.honest}</p>

          <div className="mt-8 rounded-xl border border-dashed border-edge-2 bg-paper p-5" data-testid="fit-cta-box">
            <p className="font-display text-2xl text-ink">{F.ctaTitle}</p>
            <p className="mt-1 text-sm text-ink-2">{F.ctaBody}</p>
            <button onClick={makeKit} className="btn btn-primary mt-4" data-testid="fit-cta">{F.cta}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const StatusChip = ({ item, labels }: { item: FitItem; labels: Record<FitItem["status"], string> }) => {
  const cls = item.status === "found" ? "bg-moss-2 text-moss ring-moss/30" : item.status === "partial" ? "bg-gold-2 text-ink ring-gold/40" : "bg-oxblood/10 text-oxblood ring-oxblood/30";
  const mark = item.status === "found" ? "✓" : item.status === "partial" ? "~" : "✕";
  return <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 " + cls}>{mark} {labels[item.status]}</span>;
};

/** A three-quarter arc, drawn inline: no chart library for one number. */
function Gauge({ score, label }: { score: number; label: string }) {
  const r = 52, c = 2 * Math.PI * r, arc = c * 0.75, filled = arc * (Math.max(0, Math.min(100, score)) / 100);
  const tone = score >= 80 ? "var(--moss)" : score >= 60 ? "var(--gold)" : score >= 40 ? "var(--gold)" : "var(--oxblood)";
  return (
    <div className="relative grid h-36 w-36 place-items-center" data-testid="fit-gauge">
      <svg viewBox="0 0 128 128" className="absolute inset-0 h-full w-full -rotate-[135deg]" aria-hidden>
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--paper-2)" strokeWidth="10" strokeDasharray={`${arc} ${c}`} strokeLinecap="round" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={tone} strokeWidth="10" strokeDasharray={`${filled} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="text-center">
        <p className="font-display text-5xl leading-none text-ink" data-testid="fit-score">{score}</p>
        <p className="eyebrow mt-1">{label}</p>
      </div>
    </div>
  );
}
