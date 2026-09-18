"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/components/AuthProvider";
import { useDialog } from "@/components/useDialog";
import { Portal } from "@/components/Portal";
import { Badge, Button, Container, EmptyState, Icon, Input, SkeletonRows, Table, type Column } from "@/components/ui";
import type { GenerationView } from "@/lib/server/generations";
import type { SessionView } from "@/lib/server/interviews";
import { TrendChart } from "@/components/TrendChart";
import { buildTrend, toPoint } from "@/lib/interview/trend";
import { BaseResumeCard } from "@/components/BaseResumeCard";
import { ReferralCard } from "@/components/ReferralCard";
import { WhatsNew } from "@/components/WhatsNew";

/**
 * The library (surface 8). Every kit used to be a card carrying up to eight buttons of equal
 * weight, which is how a list of four kits filled a screen and told you nothing. It is a table
 * now: the title, when, how it was made, the match in tabular figures, and one action per row
 * with the rest one click deeper.
 */
export default function LibraryPage() {
  const { d, x, r, lang } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<GenerationView[] | null>(null);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [editId, setEditId] = useState<string | null>(null); const [draft, setDraft] = useState("");

  const load = () => Promise.all([
    fetch("/api/generations", { cache: "no-store" }).then((r) => r.json()).then((j) => setItems(j.items ?? [])),
    fetch("/api/interview", { cache: "no-store" }).then((r) => r.json()).then((j) => setSessions(j.items ?? [])).catch(() => {}),
  ]);
  useEffect(() => { void load(); }, [user?.id]);
  const dateOf = (iso: string) => new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : lang);
  const published = (items ?? []).filter((g) => g.publicResume);
  const trend = buildTrend(sessions.map(toPoint));

  async function rename(id: string) {
    if (draft.trim()) await fetch(`/api/generations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft.trim() }) });
    setEditId(null); void load();
  }
  async function remove(id: string) { await fetch(`/api/generations/${id}`, { method: "DELETE" }); void load(); }

  const columns: Column<GenerationView>[] = [
    {
      key: "title",
      raw: true,
      header: d.library.title,
      width: "40%",
      clamp: 2,
      cell: (g) => editId === g.id ? (
        <span className="flex items-center gap-[var(--s-2)]">
          <Input className="h-8" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus aria-label={d.library.rename} />
          <Button size="sm" onClick={() => rename(g.id)}>{d.library.save}</Button>
          <Button size="sm" variant="quiet" onClick={() => setEditId(null)}>{d.library.cancel}</Button>
        </span>
      ) : (
        <span className="block">
          <span className="block truncate font-medium text-[color:var(--ink)]">{g.title}</span>
          <span className="mt-[2px] block truncate font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">
            {d.quiz.intent[g.mode as "tailor"].t}{g.source === "voice" ? ` · ${x.library.voice}` : ""}
          </span>
        </span>
      ),
    },
    { key: "date", header: r.checks.kind.year, width: "16%", mono: true, cell: (g) => dateOf(g.createdAt) },
    { key: "match", header: d.library.matchLabel, width: "14%", align: "right", mono: true, cell: (g) => `${g.matchAfter}%` },
    {
      key: "state", header: "", width: "14%", cell: (g) => (
        <Badge tone={g.unlocked ? "kept" : "neutral"}>{g.unlocked ? x.library.unlocked : x.library.locked}</Badge>
      ),
    },
    {
      key: "actions", header: "", width: "16%", align: "right", raw: true, cell: (g) => (
        <span className="flex items-center justify-end gap-[var(--s-2)]">
          {g.unlocked
            ? <Button size="sm" variant="outline" href={`/edit/${g.id}`} data-testid="library-edit">{r.editor.cta}</Button>
            : <Button size="sm" variant="outline" href={`/start?gen=${g.id}`}>{x.library.open}</Button>}
          <RowMenu g={g} onRename={() => { setEditId(g.id); setDraft(g.title); }} onRemove={() => remove(g.id)} />
        </span>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <Container className="py-[var(--s-10)]">
        <WhatsNew />
        <div className="grid gap-[var(--gutter)] md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="eyebrow">ResumeTailor</p>
            <h1 className="doc-45 mt-[var(--s-3)] text-[color:var(--ink)]" data-tour="nav-library">{d.library.title}</h1>
            <p className="mt-[var(--s-4)] max-w-[var(--measure)] font-sans text-[length:var(--ui-15)] leading-[var(--ui-15-lh)] text-[color:var(--ink-2)]">
              {user ? x.auth.title : x.credits.firstFree}
            </p>
          </div>
          <div className="md:col-span-6 md:col-start-7"><BaseResumeCard key={user?.id ?? "anon"} /></div>
        </div>

        {user && <ReferralCard key={user.id} />}

        <section className="mt-[var(--s-10)]" data-density="compact">
          {items === null ? (
            <SkeletonRows rows={3} cols={["40%", "16%", "14%", "14%"]} />
          ) : items.length === 0 ? (
            <EmptyState title={x.library.empty} action={<Button href="/start">{d.library.emptyCta}</Button>} />
          ) : (
            <div data-testid="library-list">
              <Table
                rows={items}
                columns={columns}
                getKey={(g) => g.id}
                rowAttrs={(g) => ({ "data-testid": "library-item", "data-unlocked": g.unlocked ? "1" : "0" })}
                empty={x.library.empty}
                minWidth="720px"
              />
            </div>
          )}
        </section>

        {/* What an unlocked kit unlocks beyond the documents — always shown, so the tour can point at it before the first kit exists. */}
        <section className="mt-[var(--s-11)]" data-testid="library-toolkit">
          <p className="eyebrow">{x.toolkit.title}</p>
          <ul className="mt-[var(--s-4)] grid border-t border-[var(--rule)] md:grid-cols-3 md:gap-x-[var(--gutter)]">
            {(Object.keys(x.toolkit.items) as (keyof typeof x.toolkit.items)[]).map((k) => (
              <li key={k} className="border-b border-[var(--rule-hairline)] py-[var(--s-5)]" data-tour={k}>
                <p className="font-sans text-[length:var(--ui-15)] font-semibold text-[color:var(--ink)]">{x.toolkit.items[k].t}</p>
                <p className="mt-[var(--s-2)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{x.toolkit.items[k].d}</p>
              </li>
            ))}
          </ul>

          {published.length > 0 && (
            <ul className="mt-[var(--s-7)] border-t border-[var(--rule)]" data-testid="library-public">
              {published.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-[var(--s-4)] border-b border-[var(--rule-hairline)] py-[var(--s-4)]" data-testid="library-public-item" data-enabled={g.publicResume!.enabled ? "1" : "0"}>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-[var(--s-2)] truncate font-sans text-[length:var(--ui-15)] font-medium text-[color:var(--ink)]"><Icon name="globe" size={16} />{g.title}</p>
                    <p className="mt-[2px] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">
                      {g.publicResume!.enabled ? x.publish.on : x.library.locked} · {g.publicResume!.views === 0 ? x.publish.noViews : x.publish.views(g.publicResume!.views)}{g.publicResume!.hasPin ? ` · ${x.publish.pinOn}` : ""}
                    </p>
                  </div>
                  {g.publicResume!.enabled && <Button size="sm" variant="outline" icon="external" iconEnd newTab href={`/cv/${g.publicResume!.slug}`} label={`${x.publish.open} · ${g.title}`}>{x.publish.open}</Button>}
                  <Button size="sm" variant="quiet" href={`/start?gen=${g.id}`}>{x.library.open}</Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Practice sessions: always shown, so the tour can point at it before the first kit exists. */}
        <section className="mt-[var(--s-11)]" data-tour="interview" data-testid="library-sessions">
          <p className="eyebrow">{x.interview.eyebrow}</p>
          <h2 className="doc-31 mt-[var(--s-3)] text-[color:var(--ink)]">{x.interview.sessionsTitle}</h2>
          <p className="mt-[var(--s-4)] max-w-[var(--measure)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">{x.interview.sessionsIntro}</p>

          {trend.sessions > 0 && trend.latest && (
            <Link href="/interview" className="mt-[var(--s-6)] flex flex-wrap items-center gap-[var(--s-6)] border-y border-[var(--rule)] py-[var(--s-5)] transition-colors hover:bg-[var(--sunken)]" data-testid="library-trend">
              <div className="min-w-0 flex-1">
                <p className="eyebrow">{x.progress.libraryTitle}</p>
                <p className="mt-[var(--s-2)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-2)]">
                  {x.progress.runs(trend.sessions)}
                  {trend.sessions > 1 && (
                    <span className="ml-[var(--s-3)] font-mono tabular-nums" style={{ color: trend.delta > 0 ? "var(--kept)" : trend.delta < 0 ? "var(--mark)" : "var(--ink-muted)" }} data-testid="library-trend-delta">
                      {trend.delta > 0 ? "+" : ""}{trend.delta}
                    </span>
                  )}
                  {trend.weakest && <span className="ml-[var(--s-3)] text-[color:var(--ink-muted)]">· {x.progress.tiles.weakest}: {x.interview.scores[trend.weakest]}</span>}
                </p>
              </div>
              <TrendChart values={trend.points.map((p) => p.overall)} />
              <p className="font-mono text-[length:var(--mn-24)] font-medium tabular-nums text-[color:var(--ink)]">{trend.latest.overall}<span className="text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">/10</span></p>
              <span className="font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]">{x.progress.seeAll}</span>
            </Link>
          )}

          {sessions.length === 0 ? (
            <p className="mt-[var(--s-6)] border-t border-[var(--rule-hairline)] pt-[var(--s-5)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{x.interview.sessionsEmpty}</p>
          ) : (
            <ul className="mt-[var(--s-6)] border-t border-[var(--rule)]">
              {sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-[var(--s-5)] border-b border-[var(--rule-hairline)] py-[var(--s-4)]" data-testid="session-item">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-[length:var(--ui-15)] font-medium text-[color:var(--ink)]">{s.kitTitle}{s.targetRole ? ` · ${s.targetRole}` : ""}</p>
                    <p className="mt-[2px] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">
                      {dateOf(s.createdAt)} · {s.mode === "preview" ? x.interview.preview : x.interview.fullBadge(s.questions.length)} · {x.interview.answered(s.aggregate.answered, s.questions.length)} · {s.status === "done" ? x.interview.completed : x.interview.inProgress}
                    </p>
                  </div>
                  {s.aggregate.answered > 0 && (
                    <p className="font-mono text-[length:var(--mn-24)] font-medium tabular-nums text-[color:var(--ink)]" title={x.interview.overall}>
                      {s.aggregate.overall}<span className="text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">/10</span>
                    </p>
                  )}
                  <Button size="sm" variant="outline" href={`/interview/${s.generationId}?session=${s.id}`}>{x.interview.open}</Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
      <SiteFooter />
    </div>
  );
}

/**
 * Everything else a kit can do, one click deeper — so each row has exactly one visible action.
 *
 * The panel goes through a portal, fixed to the button's own rectangle. Inside the table it was
 * absolutely positioned, and the table's sideways-scrolling pane (`overflow-x: auto`, which makes
 * the other axis `auto` too) clipped it: the menu was in the DOM and invisible.
 */
function RowMenu({ g, onRename, onRemove }: { g: GenerationView; onRename: () => void; onRemove: () => void }) {
  const { d, x, r, l } = useI18n();
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const ref = useDialog<HTMLDivElement>(() => setOpen(false));
  const item = "flex w-full items-center justify-between gap-[var(--s-5)] px-[var(--s-5)] py-[var(--s-3)] text-left font-sans text-[length:var(--ui-13)] text-[color:var(--ink-2)] hover:bg-[var(--sunken)] hover:text-[color:var(--ink)]";
  const toggle = () => {
    if (open) return setOpen(false);
    const box = anchor.current?.getBoundingClientRect();
    if (box) setAt({ top: box.bottom + 4, right: Math.max(8, window.innerWidth - box.right) });
    setOpen(true);
  };
  return (
    <span className="relative" ref={anchor}>
      <Button size="sm" variant="quiet" icon="menu" label={l.menu.more} onClick={toggle} aria-expanded={open} data-testid="library-more" />
      {open && at && (
        <Portal>
          <div
            ref={ref}
            role="menu"
            className="fixed z-50 w-[230px] rounded-[var(--r-2)] border border-[var(--rule)] bg-[var(--raised)] py-[var(--s-2)] text-left"
            style={{ top: at.top, right: at.right, boxShadow: "var(--shadow-pop)" }}
          >
            <Link href={`/start?gen=${g.id}`} className={item} role="menuitem">{x.library.open}</Link>
            <Link href={`/interview/${g.id}`} className={item} role="menuitem" data-testid="library-practice">{x.interview.practice}</Link>
            <Link href={`/pitch/${g.id}`} className={item} role="menuitem" data-testid="library-pitch">{r.pitch.cta}</Link>
            {g.unlocked && <Link href={`/linkedin/${g.id}`} className={item} role="menuitem" data-testid="library-linkedin">{x.linkedin.cta}</Link>}
            {g.unlocked && <Link href={`/print?id=${g.id}`} target="_blank" className={item} role="menuitem">{x.library.print}</Link>}
            {g.unlocked && <Link href={`/start?new=tailor&base=kit&kit=${g.id}`} className={item} role="menuitem" title={r.profile.newJobHint} data-testid="library-new-job">{r.profile.newJob}</Link>}
            <hr className="my-[var(--s-2)] h-px border-0 bg-[var(--rule-hairline)]" />
            <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); onRename(); }}>{d.library.rename}</button>
            <button type="button" role="menuitem" className={`${item} text-[color:var(--mark)]`} onClick={() => { setOpen(false); onRemove(); }}>{d.library.delete}</button>
          </div>
        </Portal>
      )}
    </span>
  );
}
