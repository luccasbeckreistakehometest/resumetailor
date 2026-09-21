"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/**
 * What the product says when it has nothing, is fetching, or has failed (docs/DESIGN.md §11.5).
 * All three are designed at the same time as the happy path — that is the difference between a
 * system and a screenshot.
 */

/**
 * Empty state: a left-aligned block in the content column. No centred card, no illustration, no
 * exclamation mark. One sentence in the document voice, one line of explanation, one action.
 */
export function EmptyState({
  title, children, action, className = "",
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-[var(--measure)] py-[var(--s-8)] ${className}`}>
      <p className="doc-21 text-[color:var(--ink)]">{title}</p>
      {children && <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{children}</p>}
      {action && <div className="mt-[var(--s-5)]">{action}</div>}
    </div>
  );
}

/**
 * A skeleton matches the final layout exactly — same heights, same widths, same number of rows —
 * or it is a lie about what is coming. Three rows, because three is what the lists render.
 */
export function Skeleton({ w = "100%", h = 16, className = "" }: { w?: string | number; h?: number; className?: string }) {
  return <span className={`skeleton block rounded-[var(--r-1)] bg-[var(--skeleton)] ${className}`} style={{ width: w, height: h }} aria-hidden />;
}

export function SkeletonRows({ rows = 3, cols = [] as string[], className = "" }: { rows?: number; cols?: string[]; className?: string }) {
  const widths = cols.length ? cols : ["40%", "18%", "18%"];
  return (
    <div className={className} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex h-[var(--row-h)] items-center gap-[var(--s-7)] border-b border-[var(--rule-hairline)]">
          {widths.map((w, c) => <Skeleton key={c} w={w} h={12} />)}
        </div>
      ))}
    </div>
  );
}

/**
 * An inline notice. Four tones and they mean what the colour system says they mean: a mark is
 * something wrong with the document, kept is something verified, query is a question waiting on
 * the reader. Neutral is the tool talking.
 */
export function Notice({
  tone = "neutral", icon, title, children, action, className = "",
}: {
  tone?: "neutral" | "mark" | "kept" | "query";
  icon?: IconName;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const look = {
    neutral: { bg: "var(--sunken)", edge: "var(--rule)", ink: "var(--ink-2)" },
    mark: { bg: "var(--mark-wash)", edge: "var(--mark)", ink: "var(--mark)" },
    kept: { bg: "var(--kept-wash)", edge: "var(--kept)", ink: "var(--kept)" },
    query: { bg: "var(--query-wash)", edge: "var(--query)", ink: "var(--query)" },
  }[tone];
  return (
    <div
      role={tone === "mark" ? "alert" : "note"}
      className={`flex items-start gap-[var(--s-4)] rounded-[var(--r-1)] px-[var(--s-5)] py-[var(--s-4)] ${className}`}
      style={{ background: look.bg, borderLeft: `2px solid ${look.edge}` }}
    >
      {icon && <span style={{ color: look.ink }} className="mt-[2px]"><Icon name={icon} size={16} /></span>}
      <div className="min-w-0 flex-1">
        {title && <p className="font-sans text-[length:var(--ui-13)] font-semibold" style={{ color: look.ink }}>{title}</p>}
        <div className="font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">{children}</div>
      </div>
      {action}
    </div>
  );
}
