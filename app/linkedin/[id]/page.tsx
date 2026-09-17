"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { SiteHeader } from "@/components/SiteHeader";
import { Container, Eyebrow } from "@/components/ui";
import { profileAsText } from "@/lib/linkedin/logic";
import type { LinkedInView } from "@/app/api/generations/[id]/linkedin/route";

type Phase = "loading" | "missing" | "locked" | "generating" | "ready" | "error";

/** /linkedin/[kit id] — the whole LinkedIn profile rewritten for the kit's target role, one screen, copy per section. */
export default function LinkedInPage() {
  const { x, l } = useI18n();
  const L = x.linkedin;
  const params = useParams();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) ?? "";
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<LinkedInView | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const g = await fetch(`/api/generations/${id}/linkedin`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (cancelled) return;
      if (!g) { setPhase("missing"); return; }
      if (g.locked) { setPhase("locked"); return; }
      if (g.linkedin) { setData(g.linkedin); setPhase("ready"); return; }
      setPhase("generating");
      const r = await fetch(`/api/generations/${id}/linkedin`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (cancelled) return;
      if (!r.ok) { setError(apiErrorText(j, l, x.errors.generic)); setPhase("error"); return; }
      setData(j); setPhase("ready");
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function copy(key: string, text: string) { try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); } catch {} }
  const labels = { copy: L.copy, copied: L.copied };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="max-w-3xl py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>{L.eyebrow}{data ? ` · ${data.title}` : ""}</Eyebrow>
            <h1 className="font-display mt-2 text-4xl text-ink">{L.title}</h1>
            <p className="mt-2 max-w-2xl text-ink-2">{L.intro}</p>
          </div>
          <Link href={`/start?gen=${id}`} className="text-sm text-muted hover:text-ink">← {x.interview.toKit}</Link>
        </div>

        {phase === "missing" && <div className="card mt-8 p-8 text-center"><p className="text-ink-2">{x.interview.kitMissing}</p><Link href="/library" className="btn btn-ghost mt-5">{x.interview.toLibrary}</Link></div>}
        {phase === "locked" && (
          <div className="card mt-8 p-8 text-center" data-testid="li-locked">
            <p className="text-4xl">🔒</p>
            <p className="mt-3 text-ink-2">{L.locked}</p>
            <Link href={`/start?gen=${id}`} className="btn btn-primary mt-5">{x.credits.unlockWith}</Link>
          </div>
        )}
        {phase === "generating" && <div className="card mt-8 p-8 text-center" data-testid="li-generating"><p className="font-display text-2xl text-ink">{L.generating}</p><p className="mt-1 text-sm text-muted">{L.generatingHint}</p></div>}
        {phase === "error" && <p className="mt-8 text-sm text-oxblood" role="alert">{error}</p>}

        {phase === "ready" && data && (
          <div className="mt-8 space-y-6" data-testid="li-profile">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="rounded-full bg-surface px-2.5 py-1 ring-1 ring-edge">{L.forRole(data.targetRole || "—")}</span>
              {data.cached && <span data-testid="li-cached">{L.cached}</span>}
              <span className="ml-auto"><CopyButton k="all" text={profileAsText(data.profile, { headline: L.headline, about: L.about, experience: L.experience, skills: L.skills })} testId="li-copy-all" copied={copied} onCopy={copy} labels={labels} /></span>
            </div>

            <section className="card p-5" data-testid="li-coverage" data-coverage={data.coverage.coverage}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink-2">{L.coverage}</h2>
                <p className="font-display text-3xl leading-none text-ink">{data.coverage.coverage}<span className="text-base text-muted">%</span></p>
              </div>
              <p className="mt-1 text-xs text-muted">{L.coverageHint}</p>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-paper-2"><div className={"h-full rounded-full " + (data.coverage.coverage >= 70 ? "bg-moss" : data.coverage.coverage >= 40 ? "bg-gold" : "bg-oxblood")} style={{ width: `${data.coverage.coverage}%` }} /></div>
              {data.coverage.matched.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5" data-testid="li-matched">{data.coverage.matched.map((k) => <span key={k} className="rounded-full bg-moss-2 px-2.5 py-1 text-xs font-medium text-moss ring-1 ring-moss/30">✓ {k}</span>)}</div>}
              {data.coverage.missing.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5" data-testid="li-missing">{data.coverage.missing.map((k) => <span key={k} className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink-2 ring-1 ring-edge">{k}</span>)}</div>}
              <p className="mt-3 text-xs text-muted">{data.profile.notes}</p>
            </section>

            <section className="card p-5">
              <h2 className="text-sm font-semibold text-ink-2">{L.headline}</h2>
              <p className="mt-1 text-xs text-muted">{L.headlineHint}</p>
              <ul className="mt-3 space-y-2">
                {data.profile.headlines.map((h, i) => (
                  <li key={i} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-edge bg-paper p-3" data-testid="li-headline">
                    <p className="text-[15px] text-ink">{h}</p>
                    <span className="flex items-center gap-2"><span className="text-[11px] text-muted">{h.length}/220</span><CopyButton k={`h${i}`} text={h} copied={copied} onCopy={copy} labels={labels} /></span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold text-ink-2">{L.about}</h2><CopyButton k="about" text={data.profile.about} copied={copied} onCopy={copy} labels={labels} /></div>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink" data-testid="li-about">{data.profile.about}</p>
            </section>

            <section className="card p-5">
              <h2 className="text-sm font-semibold text-ink-2">{L.experience}</h2>
              <p className="mt-1 text-xs text-muted">{L.experienceHint}</p>
              <div className="mt-3 space-y-4">
                {data.profile.experience.map((e, i) => (
                  <div key={i} className="rounded-xl border border-edge bg-paper p-4" data-testid="li-role">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-ink">{e.title}{e.company ? ` — ${e.company}` : ""}{e.period ? <span className="ml-2 text-xs font-normal text-muted">{e.period}</span> : null}</p>
                      <CopyButton k={`exp${i}`} text={e.bullets.map((b) => `• ${b}`).join("\n")} copied={copied} onCopy={copy} labels={labels} />
                    </div>
                    <ul className="mt-2 space-y-1.5">{e.bullets.map((b, j) => <li key={j} className="flex gap-2 text-sm text-ink-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{b}</li>)}</ul>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold text-ink-2">{L.skills}</h2><CopyButton k="skills" text={data.profile.skills.join(", ")} copied={copied} onCopy={copy} labels={labels} /></div>
              <p className="mt-1 text-xs text-muted">{L.skillsHint}</p>
              <div className="mt-3 flex flex-wrap gap-1.5" data-testid="li-skills">{data.profile.skills.map((s, i) => <span key={s} className={"rounded-full px-2.5 py-1 text-xs font-medium ring-1 " + (i < 5 ? "bg-ink text-paper ring-ink" : "bg-surface text-ink-2 ring-edge")}>{i < 5 ? "📌 " : ""}{s}</span>)}</div>
            </section>
            <p className="text-[11px] text-muted">{L.honest}</p>
          </div>
        )}
      </Container>
    </div>
  );
}

function CopyButton({ k, text, testId, copied, onCopy, labels }: { k: string; text: string; testId?: string; copied: string; onCopy: (k: string, text: string) => void; labels: { copy: string; copied: string } }) {
  return <button onClick={() => onCopy(k, text)} className="btn btn-ghost !py-1 !text-xs" data-testid={testId ?? `li-copy-${k}`}>{copied === k ? labels.copied : labels.copy}</button>;
}
