"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { TrendChart } from "@/components/TrendChart";
import { useAuth } from "@/components/AuthProvider";
import { Container, Eyebrow } from "@/components/ui";
import { DIMENSIONS } from "@/lib/interview/logic";
import { buildTrend, toPoint } from "@/lib/interview/trend";
import type { SessionView } from "@/lib/server/interviews";

/** /interview — how practice is going across every kit: score trend, strongest and weakest dimension, what to rehearse next. */
export default function InterviewOverviewPage() {
  const { x, lang } = useI18n();
  const P = x.progress;
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionView[] | null>(null);
  useEffect(() => { fetch("/api/interview", { cache: "no-store" }).then((r) => r.json()).then((j) => setSessions(j.items ?? [])).catch(() => setSessions([])); }, [user?.id]);
  const trend = useMemo(() => buildTrend((sessions ?? []).map(toPoint)), [sessions]);
  const dateOf = (iso: string) => new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : lang, { day: "numeric", month: "short" });
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container width="reading" className="py-[var(--s-11)]">
        <div data-tour="progress">
          <Eyebrow>{P.eyebrow}</Eyebrow>
          <h1 className="font-display mt-2 text-4xl text-ink">{P.title}</h1>
          <p className="mt-2 max-w-2xl text-ink-2">{P.intro}</p>
        </div>

        {sessions && trend.sessions === 0 && (
          <div className="card mt-8 p-10 text-center" data-testid="progress-empty">
            <p className="text-ink-2">{P.empty}</p>
            <Link href="/library" className="btn btn-primary mt-6">{x.interview.toLibrary}</Link>
          </div>
        )}

        {trend.sessions > 0 && trend.latest && (
          <>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="progress-tiles">
              <div className="card p-4"><p className="eyebrow">{P.tiles.sessions}</p><p className="font-display mt-1 text-3xl text-ink" data-testid="progress-sessions">{trend.sessions}</p><p className="text-xs text-muted">{P.answers(trend.answers)}</p></div>
              <div className="card p-4 border-2 !border-ink">
                <p className="eyebrow">{P.tiles.latest}</p>
                <p className="font-display mt-1 text-3xl text-ink" data-testid="progress-latest">{trend.latest.overall}<span className="text-sm text-muted">/10</span></p>
                {trend.sessions > 1 && <p className={"text-xs font-semibold " + (trend.delta > 0 ? "text-moss" : trend.delta < 0 ? "text-oxblood" : "text-muted")} data-testid="progress-delta" data-delta={trend.delta}>{trend.delta > 0 ? "▲" : trend.delta < 0 ? "▼" : "–"} {signed(trend.delta)} {P.sinceFirst}</p>}
              </div>
              <div className="card p-4"><p className="eyebrow">{P.tiles.strongest}</p><p className="mt-1 font-semibold text-moss" data-testid="progress-strongest">{trend.strongest ? x.interview.scores[trend.strongest] : "—"}</p><p className="text-xs text-muted">{trend.strongest ? `${trend.averages[trend.strongest]}/10` : ""}</p></div>
              <div className="card p-4"><p className="eyebrow">{P.tiles.weakest}</p><p className="mt-1 font-semibold text-oxblood" data-testid="progress-weakest">{trend.weakest ? x.interview.scores[trend.weakest] : "—"}</p><p className="text-xs text-muted">{trend.weakest ? `${trend.averages[trend.weakest]}/10` : ""}</p></div>
            </div>

            <div className="card mt-6 p-6" data-testid="progress-chart">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="eyebrow">{P.chartTitle}</p><p className="mt-1 text-sm text-ink-2">{P.chartHint}</p></div>
                <p className="text-xs text-muted">{dateOf(trend.first!.createdAt)} → {dateOf(trend.latest.createdAt)}</p>
              </div>
              <div className="mt-4 overflow-x-auto"><TrendChart values={trend.points.map((p) => p.overall)} width={640} height={120} className="h-auto w-full max-w-2xl" testId="progress-svg" /></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {DIMENSIONS.map((d) => (
                  <div key={d} className="rounded-lg bg-paper px-3 py-2 text-sm"><span className="text-ink-2">{x.interview.scores[d]}</span><span className="float-right font-semibold text-ink">{trend.averages[d]}</span></div>
                ))}
              </div>
            </div>

            {trend.next && (
              <div className="mt-6 rounded-xl border border-gold bg-gold-2 p-5" data-testid="progress-next">
                <p className="eyebrow">{P.nextTitle}</p>
                <p className="mt-1 font-display text-2xl text-ink">{x.interview.scores[trend.next.dimension]}</p>
                <p className="mt-1 text-sm text-ink-2">{P.advice[trend.next.dimension]}</p>
                <Link href={`/interview/${trend.next.generationId}`} className="btn btn-primary mt-4 !py-2 !text-sm" data-testid="progress-practise">{P.practise(trend.next.kitTitle)}</Link>
              </div>
            )}

            <p className="eyebrow mt-10">{P.perKit}</p>
            <ul className="mt-3 space-y-3" data-testid="progress-kits">
              {trend.kits.map((k) => (
                <li key={k.generationId} className="card flex flex-wrap items-center gap-4 p-4" data-testid="progress-kit">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{k.kitTitle}{k.targetRole ? ` · ${k.targetRole}` : ""}</p>
                    <p className="mt-1 text-xs text-muted">{P.runs(k.points.length)} · {dateOf(k.first.createdAt)} → {dateOf(k.latest.createdAt)}{k.points.length > 1 ? ` · ${signed(k.delta)}` : ""}</p>
                  </div>
                  <TrendChart values={k.points.map((p) => p.overall)} />
                  <p className="font-display text-3xl text-ink">{k.latest.overall}<span className="text-sm text-muted">/10</span></p>
                  <Link href={`/interview/${k.generationId}`} className="btn btn-ghost !py-1.5 !text-sm">{x.interview.again}</Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Container>
    </div>
  );
}
