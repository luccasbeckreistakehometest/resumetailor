import type { ReactNode } from "react";

/**
 * The four named layouts (docs/DESIGN.md §5.2). A screen picks one and says which; what it must
 * not do is centre a max-w-6xl and fill it with equal cards, which is the shape this codebase is
 * leaving. Each one states its stacking rule, because a layout without one overlaps on a phone.
 */

/** 12 columns, 1200px, 24px gutter (16px under 768). Everything else sits inside this. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[var(--page-max)] px-[var(--s-5)] sm:px-[var(--s-7)] ${className}`}>{children}</div>;
}

/** L-prose: one column at the measure, offset into columns 2–8. Not centred — set on the page. */
export function Prose({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-12 gap-x-[var(--gutter)] ${className}`}>
      <div className="col-span-12 max-w-[var(--measure)] md:col-span-8 md:col-start-2">{children}</div>
    </div>
  );
}

/**
 * L-editorial: 7 / 1 / 4 — the default. Headings, prose and forms in the 7; meters, sources, notes
 * and secondary actions in the 4. Stacks 8/4 between 768 and 1024, one column below 768, where the
 * aside drops below the content — unless it carries the verdict, and then `asideFirst` lifts it
 * above, because on a phone the score comes first.
 */
export function Editorial({
  children, aside, asideFirst = false, className = "",
}: { children: ReactNode; aside?: ReactNode; asideFirst?: boolean; className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-x-[var(--gutter)] gap-y-[var(--s-8)] md:grid-cols-12 ${className}`}>
      <div className={`md:col-span-8 lg:col-span-7 ${asideFirst ? "order-2 md:order-none" : ""}`}>{children}</div>
      {aside && (
        <aside className={`md:col-span-4 lg:col-span-4 lg:col-start-9 ${asideFirst ? "order-1 md:order-none" : ""}`}>{aside}</aside>
      )}
    </div>
  );
}

/** L-document: the 816px sheet with a 320px rail to its right; the rail drops under it below 1280. */
export function DocumentLayout({ children, rail, className = "" }: { children: ReactNode; rail?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-start gap-[var(--s-8)] xl:flex-row xl:justify-center ${className}`}>
      <div className="w-full min-w-0 xl:w-[816px] xl:shrink-0">{children}</div>
      {rail && <div className="w-full xl:w-[320px] xl:shrink-0" data-density="compact">{rail}</div>}
    </div>
  );
}

/** L-tool: a 320px rail against a fluid pane, one rule between them, no gap. Drawer below 1024. */
export function ToolLayout({ rail, children, className = "" }: { rail: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-0 flex-col lg:flex-row ${className}`} data-density="compact">
      <div className="w-full shrink-0 border-b border-[var(--rule)] lg:w-[320px] lg:border-b-0 lg:border-r">{rail}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Vertical rhythm between sections: 56 / 72 / 96 by breakpoint, never one py-20 everywhere. */
export function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`py-[var(--s-10)] md:py-[var(--s-11)] lg:py-[var(--s-12)] ${className}`}>{children}</section>;
}
