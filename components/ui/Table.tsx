"use client";

import type { ReactNode } from "react";

/**
 * Table (docs/DESIGN.md §9.2). This product has at least five real tables — keyword coverage,
 * before/after, applications by stage, versions, admin lists — and today every one of them is a
 * grid of cards. It is data-driven on purpose: the alignment, the truncation, the zebra threshold
 * and the empty state are decisions of the system, not of the caller.
 *
 *   <Table
 *     rows={kits} getKey={(k) => k.id} empty="No kits yet."
 *     columns={[
 *       { key: "title", header: "Kit", clamp: 2, cell: (k) => k.title },
 *       { key: "match", header: "Match", align: "right", cell: (k) => k.match },
 *     ]}
 *   />
 *
 *  · Header: ui-13 500, muted, one rule under it, sticky inside its own scroll pane.
 *  · Rows: a hairline between them. Zebra ONLY above 12 rows — below that, rules read cleaner,
 *    and never both.
 *  · Numbers: right-aligned with tabular figures, header included. Left-aligned figures are the
 *    single clearest tell that nobody set the table.
 *  · A long cell never silently grows the row: one line truncated with a title, or exactly two
 *    with `clamp: 2`, and the row height is declared either way. The layout is FIXED, so the
 *    widths are the ones declared here and a long value can never starve its neighbours — an
 *    auto layout with max-width:0 collapsed the title column to 50px, which is defect D4 again.
 *  · Empty keeps the header and puts one full-width row under it, so the columns stay legible.
 */

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Lines a text cell may use before it truncates. Default 1. */
  clamp?: 1 | 2;
  /** Share of the table. Columns without one split what is left. */
  width?: string;
  /** Sets the whole column in the machine's voice. */
  mono?: boolean;
};

export function Table<T>({
  rows, columns, getKey, empty, caption, stickyFirst = false, minWidth, rowAttrs, className = "",
}: {
  rows: readonly T[];
  columns: readonly Column<T>[];
  getKey: (row: T, i: number) => string;
  empty: ReactNode;
  /** Read by a screen reader, and printed above the table on paper. */
  caption?: string;
  stickyFirst?: boolean;
  /** The width below which the pane scrolls rather than the columns collapsing. */
  minWidth?: string;
  /** Attributes for the row element itself — a test id, a data-state the caller reads back. */
  rowAttrs?: (row: T) => Record<string, string | undefined>;
  className?: string;
}) {
  const zebra = rows.length > 12;

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      {/* A table narrower than its columns need is not a table, it is five ellipses in a row: at
          390px the five-column example rendered "N…", "8…", "R…". Below the floor the pane
          scrolls sideways instead — the page body never does — and `stickyFirst` keeps the
          first column in view while it happens. */}
      <table
        className="w-full table-fixed border-collapse text-left font-sans"
        style={{ minWidth: minWidth ?? `${columns.length * 120}px` }}
      >
        {caption && <caption className="mb-[var(--s-4)] text-left font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.key}
                scope="col"
                style={{ width: c.width }}
                className={`sticky top-0 z-10 border-b border-[var(--rule)] bg-[var(--page)] px-[var(--cell-x)] py-[var(--cell-y)]
                  font-sans text-[length:var(--ui-13)] font-medium tracking-[var(--ui-13-ls)] text-[color:var(--ink-muted)] whitespace-nowrap
                  ${c.align === "right" ? "text-right tabular-nums" : c.align === "center" ? "text-center" : "text-left"}
                  ${stickyFirst && i === 0 ? "left-0 z-20" : ""}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="border-b border-[var(--rule-hairline)] px-[var(--cell-x)] py-[var(--s-8)] text-[length:var(--ui-15)] text-[color:var(--ink-muted)]">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr
              key={getKey(row, i)}
              {...(rowAttrs?.(row) ?? {})}
              className={`group transition-colors duration-[var(--dur-1)] hover:bg-[var(--sunken)] ${zebra && i % 2 === 1 ? "bg-[var(--zebra)]" : ""}`}
            >
              {columns.map((c, ci) => {
                const value = c.cell(row);
                return (
                  <td
                    key={c.key}
                    title={typeof value === "string" ? value : undefined}
                    className={`border-b border-[var(--rule-hairline)] px-[var(--cell-x)] py-[var(--cell-y)]
                      align-middle text-[length:var(--density-body)] text-[color:var(--ink-2)]
                      ${c.mono ? "font-mono tabular-nums" : ""}
                      ${c.align === "right" ? "text-right tabular-nums text-[color:var(--ink)]" : c.align === "center" ? "text-center" : "text-left"}
                      ${stickyFirst && ci === 0 ? "sticky left-0 bg-[var(--page)] group-hover:bg-[var(--sunken)]" : ""}`}
                    style={{ height: c.clamp === 2 ? "var(--row-h-2)" : "var(--row-h)" }}
                  >
                    {/* The clamp lives on an inner block, never on the cell: overflow:hidden on a
                        td clips its own bottom border, so the row's rule sits half a pixel out of
                        line with its neighbours and the text stops centring. Seen at 3×. */}
                    <span className={c.clamp === 2 ? "block overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]" : "block truncate"}>
                      {value}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
