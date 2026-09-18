"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { RedFlagNotice } from "@/components/RedFlagNotice";
import { ImportableTextarea } from "@/components/FileDrop";
import { Container, Stamp } from "@/components/ui";
import { extractKeywords, keywordOverlap } from "@/lib/ats/check";
import { track } from "@/lib/client/track";
import type { FitView } from "@/lib/server/fit";

type Posting = { text: string; link: string; title: string; company: string; salary: string; postedAt: string | null; note: string };
type Result = { index: number; score: number; gaps: string[]; capped: boolean; role: string };
const MAX = 5;
const blank = (): Posting => ({ text: "", link: "", title: "", company: "", salary: "", postedAt: null, note: "" });

/**
 * The job comparator: up to five postings (pasted or imported from a public job-board link)
 * against one résumé, checked one after another with the free fit check (cached, capped), ranked,
 * with warning signs and one-click "make the kit" / "save to tracker".
 */
export function CompareView() {
  const { r, l, x, lang } = useI18n();
  const C = r.compare;
  const router = useRouter();
  const [postings, setPostings] = useState<Posting[]>([blank(), blank()]);
  const [resume, setResume] = useState("");
  const [fromProfile, setFromProfile] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [tracked, setTracked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let alive = true;
    fetch("/api/profile", { cache: "no-store" }).then((res) => res.json()).then((j) => {
      if (!alive || !j.profile?.resume) return;
      setResume((cur) => cur || j.profile.resume); setFromProfile(true);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const set = (i: number, patch: Partial<Posting>) => setPostings((cur) => cur.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function importLink(i: number) {
    const link = postings[i].link.trim();
    if (!link) return;
    setBusy(`import-${i}`); set(i, { note: "" });
    const res = await fetch("/api/jobs/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: link }) });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.status === 422) return set(i, { note: C.unsupported });
    if (!res.ok || !j.job) return set(i, { note: res.status === 502 ? C.importFailed : apiErrorText(j, l, C.importFailed) });
    set(i, { text: j.job.text, title: j.job.title, company: j.job.company, salary: j.job.salary ?? "", postedAt: j.job.postedAt ?? null, link: j.job.url ?? link, note: C.imported(j.job.title, j.job.company) });
  }

  async function run() {
    const filled = postings.map((p, index) => ({ p, index })).filter(({ p }) => p.text.trim().length >= 30);
    if (!filled.length || resume.trim().length < 30) { setError(C.needTwo); return; }
    setError(""); setResults([]); setTracked({});
    track("compare_run", { jobs: filled.length });
    const out: Result[] = [];
    for (let k = 0; k < filled.length; k++) {
      const { p, index } = filled[k];
      setBusy(C.running(k + 1, filled.length));
      const res = await fetch("/api/fit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ posting: p.text, resume, lang }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        const fit = j as FitView;
        out.push({ index, score: fit.score, gaps: fit.gaps.map((g) => g.requirement), capped: false, role: fit.role });
      } else if (res.status === 429 || res.status === 503) {
        // Out of AI checks today (or AI down): the free keyword overlap still ranks them.
        const kw = keywordOverlap(resume, extractKeywords(p.text));
        out.push({ index, score: kw.coverage ?? 0, gaps: kw.missing.slice(0, 3), capped: true, role: p.title });
      } else {
        setError(apiErrorText(j, l, x.errors.generic));
      }
      setResults([...out].sort((a, b) => b.score - a.score));
    }
    setBusy(null);
  }

  function makeKit(res: Result) {
    const p = postings[res.index];
    try { sessionStorage.setItem("rt_fit_carry", JSON.stringify({ role: res.role || p.title, posting: p.text, resume })); } catch {}
    router.push("/start?from=fit");
  }

  async function saveToTracker(res: Result) {
    const p = postings[res.index];
    const r2 = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: p.company || C.untitled(res.index + 1), role: res.role || p.title, link: p.link, stage: "saved", notes: p.salary ? `${C.salary}: ${p.salary}` : "" }) });
    if (r2.ok) setTracked((t) => ({ ...t, [res.index]: true }));
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container width="reading" className="py-[var(--s-10)]">
        <Stamp>{C.eyebrow}</Stamp>
        <h1 className="font-display mt-4 text-4xl leading-tight text-ink sm:text-5xl">{C.h1}</h1>
        <p className="mt-3 max-w-3xl text-lg text-ink-2">{C.intro}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2" data-testid="compare-postings">
          {postings.map((p, i) => (
            <div key={i} className="card p-4" data-testid="compare-posting">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">{C.posting(i + 1)}</p>
                {postings.length > 1 && <button type="button" onClick={() => setPostings((cur) => cur.filter((_, j) => j !== i))} className="text-xs text-muted hover:text-oxblood">{C.remove}</button>}
              </div>
              <div className="mt-2 flex gap-2">
                <input className="field !py-1.5 !text-sm" placeholder={C.linkPh} value={p.link} onChange={(e) => set(i, { link: e.target.value })} data-testid="compare-link" />
                <button type="button" onClick={() => void importLink(i)} disabled={!!busy || !p.link.trim()} className="btn btn-ghost !py-1.5 !text-sm" data-testid="compare-import">{busy === `import-${i}` ? C.importing : C.import}</button>
              </div>
              {p.note && <p className="mt-1 text-xs text-ink-2" data-testid="compare-note">{p.note}</p>}
              <textarea aria-label={C.posting(i + 1)} className="field mt-2" rows={6} placeholder={C.pastePh} value={p.text} onChange={(e) => set(i, { text: e.target.value })} data-testid="compare-text" />
              <RedFlagNotice text={p.text} postedAt={p.postedAt} compact />
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setPostings((cur) => [...cur, blank()])} disabled={postings.length >= MAX} className="btn btn-ghost !py-2 !text-sm" data-testid="compare-add">{C.addJob}</button>
          <span className="text-xs text-muted">{C.maxJobs}</span>
        </div>

        <div className="card mt-6 p-4">
          <p className="font-semibold text-ink">{C.resume}</p>
          {fromProfile && <p className="text-xs text-moss">📄 {C.useSaved}</p>}
          <div className="mt-2"><ImportableTextarea id="compare-resume" label={C.resume} value={resume} onChange={setResume} rows={6} placeholder={C.resumePh} testId="compare-resume" importTestId="compare-resume-import" /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void run()} disabled={!!busy} className="btn btn-primary" data-testid="compare-run">{C.run}</button>
          {busy && !busy.startsWith("import-") && <span className="text-sm text-muted" role="status">{busy}</span>}
          {error && <p className="text-sm text-oxblood" role="alert">{error}</p>}
        </div>
        <RedFlagNotice text={postings.map((p) => p.text).join("\n")} />

        {results.length > 0 && (
          <section className="mt-10" data-testid="compare-results">
            <h2 className="font-display text-3xl text-ink">{C.resultsTitle}</h2>
            <ol className="mt-4 space-y-3">
              {results.map((res, rank) => {
                const p = postings[res.index];
                return (
                  <li key={res.index} className="card flex flex-wrap items-start gap-4 p-4" data-testid="compare-result" data-score={res.score}>
                    <p className="font-display text-4xl text-edge-2">{rank + 1}</p>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{p.title || res.role || C.untitled(res.index + 1)}{p.company ? ` · ${p.company}` : ""}</p>
                      <p className="mt-1 text-sm text-ink-2"><strong className="text-ink">{res.capped ? C.keywordScore : C.score}: {res.score}{res.capped ? "%" : "/100"}</strong>{p.salary ? ` · ${C.salary}: ${p.salary}` : ""}</p>
                      <p className="mt-1 text-sm text-ink-2">{res.gaps.length ? `${C.gaps}: ${res.gaps.join(" · ")}` : C.noGaps}</p>
                      {res.capped && <p className="mt-1 text-xs text-muted">{C.capped}</p>}
                      <RedFlagNotice text={p.text} postedAt={p.postedAt} compact />
                    </div>
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={() => makeKit(res)} className="btn btn-primary !py-1.5 !text-sm" data-testid="compare-kit">{C.makeKit}</button>
                      <button type="button" onClick={() => void saveToTracker(res)} disabled={tracked[res.index]} className="btn btn-ghost !py-1.5 !text-sm" data-testid="compare-track">{tracked[res.index] ? `✓ ${C.tracked}` : C.track}</button>
                      {p.link && /^https:\/\//.test(p.link) && <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-center text-xs text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px] hover:decoration-[var(--ink)]">{C.open} ↗</a>}
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-sm"><Link href="/applications" className="text-[color:var(--ink)] decoration-[var(--rule-field)] underline-offset-4 hover:underline">{x.nav.applications} →</Link></p>
          </section>
        )}
      </Container>
      <SiteFooter />
    </div>
  );
}
