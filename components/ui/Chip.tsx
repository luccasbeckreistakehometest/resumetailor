"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/**
 * Three small objects that today's product renders as one (docs/DESIGN.md §11.4). They are
 * different things, so they look different — a second chip language is banned.
 *
 *   Chip    a filter or a choice the reader can ACT on. Sans, a ground, hover, pressed state.
 *   Token   a keyword the MACHINE produced. Mono, never interactive, state on a 1px left rule.
 *   Badge   a count or a status inside a table cell. Caps micro-label, rules above and below.
 */

export function Chip({
  children, selected = false, icon, onClick, disabled, className = "",
}: {
  children: ReactNode;
  selected?: boolean;
  icon?: IconName;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex h-6 items-center gap-[var(--s-2)] rounded-[var(--r-1)] border px-[var(--s-3)] " +
    "font-sans text-[length:var(--ui-12)] font-medium leading-none " +
    "transition-colors duration-[var(--dur-1)] ease-[var(--ease-move)]";
  const look = selected
    ? "border-[var(--ink)] bg-[var(--ink)] text-[color:var(--on-ink)]"
    : "border-[var(--rule-hairline)] bg-[var(--sunken)] text-[color:var(--ink-2)]";
  const interactive = onClick && !disabled ? "cursor-pointer hover:bg-[var(--zebra)] hover:border-[var(--rule)]" : "";
  const off = disabled ? "cursor-not-allowed border-[var(--rule)] bg-[var(--sunken)] text-[color:var(--ink-40)]" : "";

  if (!onClick) return <span className={`${base} ${look} ${off} ${className}`}>{icon && <Icon name={icon} size={16} />}{children}</span>;
  return (
    <button type="button" aria-pressed={selected} disabled={disabled} onClick={onClick} className={`${base} ${look} ${interactive} ${off} ${className}`}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

/** What the parser found. The state is a 1px rule down the left edge — kept, missing or partial. */
export function Token({
  children, state = "plain", title, className = "",
}: {
  children: ReactNode;
  state?: "plain" | "kept" | "missing" | "partial";
  title?: string;
  className?: string;
}) {
  const edge = {
    plain: "border-l-[var(--rule)]",
    kept: "border-l-[var(--kept)]",
    missing: "border-l-[var(--mark)]",
    partial: "border-l-[var(--query)]",
  }[state];
  const label = { plain: undefined, kept: "present", missing: "missing", partial: "partial" }[state];
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center gap-[var(--s-2)] truncate rounded-[var(--r-1)] border border-[var(--rule)] border-l-2 ${edge}
        bg-[var(--sheet)] px-[var(--s-3)] py-[3px] font-mono text-[length:var(--mn-13)] leading-[1.3] text-[color:var(--ink-2)] ${className}`}
    >
      {children}
      {label && <span className="sr-only"> — {label}</span>}
    </span>
  );
}

/** A count or a status in a dense row: no ground, a rule above and below, caps at 11px. */
export function Badge({
  children, tone = "neutral", className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "mark" | "kept" | "query";
  className?: string;
}) {
  const colour = {
    neutral: "text-[color:var(--ink-muted)] border-[var(--rule)]",
    mark: "text-[color:var(--mark)] border-[var(--mark)]",
    kept: "text-[color:var(--kept)] border-[var(--kept)]",
    query: "text-[color:var(--query)] border-[var(--query)]",
  }[tone];
  return (
    <span className={`inline-block border-y px-[var(--s-2)] py-[2px] font-sans text-[length:var(--ui-11c)] font-bold uppercase tracking-[var(--ui-11c-ls)] ${colour} ${className}`}>
      {children}
    </span>
  );
}
