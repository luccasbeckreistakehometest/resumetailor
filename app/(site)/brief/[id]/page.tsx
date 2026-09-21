"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { Container, Eyebrow } from "@/components/ui";
import type { ApplicationView } from "@/lib/server/applications";
import type { Insights } from "@/lib/ai/insights";

type Brief = {
  app: ApplicationView & { kitTitle: string | null };
  kit: null | { id: string; title: string; targetRole: string; unlocked: boolean; emphasis: string[]; talkingPoints: string[]; questionsToAsk: string[]; weakest: "structure" | "specificity" | "relevance" | null; pitch: string | null; insights: Insights | null };
};

/** /brief/[id]: the morning of the interview, on one phone screen. Printable. */
export default function BriefPage() {
  const { id } = useParams<{ id: string }>();
  const { r, x, lang } = useI18n();
  const B = r.tracker;
  const [data, setData] = useState<Brief | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetch(`/api/applications/${id}/brief`, { cache: "no-store" }).then((res) => (res.ok ? res.json() : null)).then((j) => { if (alive) setData(j); }).catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, [id]);

  if (data === undefined) return <div className="min-h-screen"><SiteHeader /></div>;
  if (!data) return <div className="min-h-screen"><SiteHeader /><Container className="py-20 text-center text-ink-2"><p data-testid="brief-missing">{B.briefNotFound}</p></Container></div>;
  const { app, kit } = data;
  const when = app.interviewAtTime ? new Date(app.interviewAtTime).toLocaleString(lang === "pt" ? "pt-BR" : lang, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : null;
  let pitchText = "";
  try { pitchText = kit?.pitch ? (JSON.parse(kit.pitch) as { script?: string }).script ?? "" : ""; } catch { pitchText = kit?.pitch ?? ""; }

  return (
    <div className="min-h-screen">
      <div className="no-print"><SiteHeader /></div>
      <Container width="prose" className="py-[var(--s-8)]">
        <div data-testid="brief">
        <Eyebrow>{B.briefTitle}</Eyebrow>
        <h1 className="font-display mt-1 text-4xl text-ink">{app.company || app.role}</h1>
        {app.company && app.role && <p className="text-lg text-ink-2">{app.role}</p>}
        <p className="mt-1 text-sm text-muted">{B.briefIntro}</p>

        {when && (
          <div className="card mt-5 flex flex-wrap items-center justify-between gap-2 p-4">
            <p className="text-sm"><span className="eyebrow mr-2">{B.briefSections.when}</span><span className="font-semibold capitalize text-ink" data-testid="brief-when">{when}</span></p>
            <a href={`/api/applications/${app.id}/ics?kind=interview&lang=${lang}`} className="text-sm font-semibold text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px] hover:decoration-[var(--ink)] no-print">📅 {B.calendar}</a>
          </div>
        )}

        {!kit ? (
          <section className="card mt-5 p-5" data-testid="brief-generic">
            <p className="text-sm text-muted">{B.briefNoKit}</p>
            <ul className="mt-3 space-y-2">{B.briefGeneric.map((t) => <li key={t} className="flex gap-2 text-ink"><span className="text-[color:var(--ink-40)]">□</span>{t}</li>)}</ul>
          </section>
        ) : (
          <>
            <Block title={B.briefSections.story} items={kit.talkingPoints.length ? kit.talkingPoints : kit.emphasis.slice(0, 3)} testId="brief-story" />
            {kit.questionsToAsk.length > 0 && <Block title={B.briefSections.ask} items={kit.questionsToAsk} testId="brief-ask" />}
            <section className="card mt-5 p-5">
              <p className="eyebrow">{B.briefSections.rehearse}</p>
              <p className="mt-2 text-ink">{kit.weakest ? B.briefRehearse(x.interview.scores[kit.weakest]) : B.briefNoPractice}</p>
              <Link href={`/interview/${kit.id}`} className="btn btn-primary mt-3 !py-2 !text-sm no-print" data-testid="brief-practice">🎙 {B.briefPractice}</Link>
            </section>
            {pitchText && <section className="card mt-5 p-5"><p className="eyebrow">{B.briefSections.pitch}</p><p className="mt-2 whitespace-pre-line text-ink">{pitchText}</p></section>}
            {kit.insights?.found && (
              <section className="card mt-5 p-5">
                <p className="eyebrow">{B.briefSections.company}</p>
                {kit.insights.about && <p className="mt-2 text-ink">{kit.insights.about}</p>}
                {kit.insights.interview?.length ? <ul className="mt-2 list-disc pl-5 text-sm text-ink-2">{kit.insights.interview.map((t) => <li key={t}>{t}</li>)}</ul> : null}
              </section>
            )}
          </>
        )}

        {app.notes && <section className="card mt-5 p-5"><p className="eyebrow">{B.briefSections.notes}</p><p className="mt-2 whitespace-pre-line text-ink">{app.notes}</p></section>}
        <div className="mt-6 flex flex-wrap gap-3 no-print">
          <button type="button" onClick={() => window.print()} className="btn btn-ghost !py-2 !text-sm">{x.library.print}</button>
          <Link href="/applications" className="btn btn-ghost !py-2 !text-sm">← {B.briefBack}</Link>
        </div>
        </div>
      </Container>
    </div>
  );
}

const Block = ({ title, items, testId }: { title: string; items: string[]; testId: string }) => (
  <section className="card mt-5 p-5" data-testid={testId}>
    <p className="eyebrow">{title}</p>
    <ol className="mt-2 space-y-2">{items.map((t, i) => <li key={t} className="flex gap-3 text-ink"><span className="font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-40)]">{String(i + 1).padStart(2, "0")}</span><span>{t}</span></li>)}</ol>
  </section>
);
