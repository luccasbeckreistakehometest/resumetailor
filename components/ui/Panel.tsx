import type { ReactNode } from "react";

/**
 * The surfaces (docs/DESIGN.md §7.2, §11.3). Depth is reached for in order — a rule, then a
 * background step, then an inset, and a shadow LAST. A panel that sits in the page gets a rule and
 * nothing else; that is why nothing on today's kit screen outranks anything else.
 */

/** A block of the page with an edge. `raised` lifts it off the ground; it never gets a shadow. */
export function Panel({
  title, action, children, raised = false, flush = false, className = "",
}: {
  title?: ReactNode;
  /** One control in the panel's title row — an overflow menu, a link, a quiet button. */
  action?: ReactNode;
  children: ReactNode;
  raised?: boolean;
  /** Content sits against the panel edge: for tables and lists that rule themselves. */
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={`rounded-[var(--r-2)] border border-[var(--rule)] ${raised ? "bg-[var(--raised)]" : "bg-transparent"} ${className}`}>
      {title && (
        <header className="flex items-baseline justify-between gap-[var(--s-4)] border-b border-[var(--rule-hairline)] px-[var(--pane-pad)] py-[var(--s-4)]">
          <h2 className="font-sans text-[length:var(--ui-15)] font-semibold text-[color:var(--ink)]">{title}</h2>
          {action}
        </header>
      )}
      <div className={flush ? "" : "p-[var(--pane-pad)]"}>{children}</div>
    </section>
  );
}

/** An inset well: the third depth cue. For extracted text, code, quoted job ads. */
export function Well({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      /* whitespace-pre-wrap: a well holds text a parser extracted, and its line breaks ARE the
         content — collapsing them turned a résumé into one run-on line in the first render. */
      className={`overflow-x-auto rounded-[var(--r-1)] bg-[var(--sunken)] p-[var(--s-5)] font-mono text-[length:var(--mn-13)] leading-[var(--mn-13-lh)] whitespace-pre-wrap text-[color:var(--ink-2)] ${className}`}
      style={{ boxShadow: "inset 0 1px 0 var(--rule-hairline)" }}
    >
      {children}
    </div>
  );
}

/**
 * The document. The most important component in the product: 816px of paper, square corners, a
 * 56px inner margin (≈14mm at 96dpi), and the one shadow that is allowed because this object is
 * pretending to be a physical page. Below 900px it goes full-bleed with rules instead of a shadow.
 * In dark mode it dims rather than inverting, and carries its own token block (globals.css §2).
 */
export function Sheet({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`sheet mx-auto w-full max-w-[816px] p-[var(--s-7)] sm:p-[56px] ${className}`}>
      {children}
    </div>
  );
}

/** A page-break guide, so the candidate can see what falls off page one. */
export function PageBreak({ page = 2 }: { page?: number }) {
  return (
    <div className="my-[var(--s-7)] flex items-center gap-[var(--s-4)]" aria-hidden>
      <span className="eyebrow shrink-0">page {page}</span>
      <span className="h-px flex-1 border-t border-dashed border-[var(--rule)]" />
    </div>
  );
}

/** The one decorative element. Once per page, ever, and only on a claim of fact. */
export function Seal({ children }: { children: ReactNode }) {
  return <span className="stamp">{children}</span>;
}

export function Rule({ className = "" }: { className?: string }) {
  return <hr className={`h-px border-0 bg-[var(--rule)] ${className}`} />;
}
