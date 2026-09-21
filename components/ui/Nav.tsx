"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";

/**
 * Moving through a thing: steps, tabs, a trail, a page of rows (docs/DESIGN.md §11.5).
 */

/**
 * Stepper. Replaces the "STEP 1 OF 2" string, which today also lies — it says 1 of 2 and then
 * shows a third and fourth step. The total is always the true total; a past step is a link back.
 */
export function Stepper({
  steps, current, onGo, className = "",
}: {
  steps: readonly string[];
  /** 0-based. */
  current: number;
  onGo?: (i: number) => void;
  className?: string;
}) {
  return (
    <nav aria-label="Progress" className={className}>
      <ol className="flex flex-wrap items-stretch gap-x-[var(--s-7)] gap-y-[var(--s-3)] border-b border-[var(--rule)]">
        {steps.map((s, i) => {
          const state = i === current ? "current" : i < current ? "past" : "future";
          const ink = state === "current" ? "var(--ink)" : state === "past" ? "var(--ink-muted)" : "var(--ink-40)";
          const body = (
            <span className="ui-11c block pb-[var(--s-3)]" style={{ color: ink }}>
              <span className="mr-[var(--s-2)] font-mono tabular-nums">{i + 1}</span>
              {s}
            </span>
          );
          return (
            <li key={s} className="relative" aria-current={state === "current" ? "step" : undefined}>
              {state === "past" && onGo
                ? <button type="button" onClick={() => onGo(i)} className="cursor-pointer hover:text-[color:var(--ink)]">{body}</button>
                : body}
              {state === "current" && <span aria-hidden className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--mark)]" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Tabs with real keyboard behaviour: arrows move, Home/End jump, only the active tab is tabbable. */
export function Tabs({
  tabs, value, onChange, className = "",
}: {
  tabs: readonly { id: string; label: ReactNode; testId?: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1 | "home" | "end") => {
    const i = tabs.findIndex((t) => t.id === value);
    const next = dir === "home" ? 0 : dir === "end" ? tabs.length - 1 : (i + dir + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    ref.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };
  return (
    <div
      ref={ref}
      role="tablist"
      className={`flex gap-[var(--s-7)] border-b border-[var(--rule)] ${className}`}
      onKeyDown={(e) => {
        const k = e.key;
        if (k === "ArrowRight") { e.preventDefault(); move(1); }
        else if (k === "ArrowLeft") { e.preventDefault(); move(-1); }
        else if (k === "Home") { e.preventDefault(); move("home"); }
        else if (k === "End") { e.preventDefault(); move("end"); }
      }}
    >
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            data-testid={t.testId}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`relative cursor-pointer pb-[var(--s-3)] font-sans text-[length:var(--ui-13)] font-medium transition-colors duration-[var(--dur-1)]
              ${on ? "text-[color:var(--ink)]" : "text-[color:var(--ink-muted)] hover:text-[color:var(--ink-2)]"}`}
          >
            {t.label}
            {on && <span aria-hidden className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--ink)]" />}
          </button>
        );
      })}
    </div>
  );
}

export function Breadcrumb({ trail, className = "" }: { trail: readonly { label: string; href?: string }[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-[var(--s-2)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">
        {trail.map((t, i) => (
          <li key={t.label} className="flex items-center gap-[var(--s-2)]">
            {i > 0 && <Icon name="chevron-right" size={16} className="text-[color:var(--ink-40)]" />}
            {t.href && i < trail.length - 1
              ? <Link href={t.href as never} className="underline decoration-[var(--rule)] underline-offset-2 hover:text-[color:var(--ink)] hover:decoration-[var(--ink)]">{t.label}</Link>
              : <span className={i === trail.length - 1 ? "text-[color:var(--ink-2)]" : undefined} aria-current={i === trail.length - 1 ? "page" : undefined}>{t.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Counts are tabular and carry their total: "21–40 of 143", never a naked page number. */
export function Pagination({
  page, perPage, total, onPage, className = "",
}: { page: number; perPage: number; total: number; onPage: (p: number) => void; className?: string }) {
  const last = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return (
    <div className={`flex items-center justify-between gap-[var(--s-5)] border-t border-[var(--rule-hairline)] pt-[var(--s-4)] ${className}`}>
      <p className="font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">
        <span className="tabular-nums">{from}–{to}</span> of <span className="tabular-nums">{total.toLocaleString()}</span>
      </p>
      <div className="flex gap-[var(--s-3)]">
        <Button size="sm" variant="outline" icon="arrow-left" label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} />
        <Button size="sm" variant="outline" icon="arrow-right" label="Next page" disabled={page >= last} onClick={() => onPage(page + 1)} />
      </div>
    </div>
  );
}
