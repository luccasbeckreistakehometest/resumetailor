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
 *    with `clamp: 2`, and the row height is declared either way.
 *  · Empty keeps the header and puts one full-width row under it, so the columns stay legible.
 */

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Lines a text cell may use before it truncates. Default 1. */
  clamp?: 1 | 2;
  width?: string;
  /** Sets the whole column in the machine's voice. */
  mono?: boolean;
};

export function Table<T>({
  rows, columns, getKey, empty, caption, stickyFirst = false, className = "",
}: {
  rows: readonly T[];
  columns: readonly Column<T>[];
  getKey: (row: T, i: number) => string;
  empty: ReactNode;
  /** Read by a screen reader, and printed above the table on paper. */
  caption?: string;
  stickyFirst?: boolean;
  className?: string;
}) {
  const zebra = rows.length > 12;

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full border-collapse text-left font-sans">
        {caption && <caption className="mb-[var(--s-4)] text-left font-sans text-[length:var(--ui-13)] text-[var(--ink-muted)]">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.key}
                scope="col"
                style={{ width: c.width }}
                className={`sticky top-0 z-10 border-b border-[var(--rule)] bg-[var(--page)] px-[var(--cell-x)] py-[var(--cell-y)]
                  font-sans text-[length:var(--ui-13)] font-medium tracking-[var(--ui-13-ls)] text-[var(--ink-muted)] whitespace-nowrap
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
              <td colSpan={columns.length} className="border-b border-[var(--rule-hairline)] px-[var(--cell-x)] py-[var(--s-8)] text-[length:var(--ui-15)] text-[var(--ink-muted)]">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr
              key={getKey(row, i)}
              className={`group transition-colors duration-[var(--dur-1)] hover:bg-[var(--sunken)] ${zebra && i % 2 === 1 ? "bg-[var(--zebra)]" : ""}`}
            >
              {columns.map((c, ci) => (
                <td
                  key={c.key}
                  className={`h-[var(--row-h)] max-w-0 border-b border-[var(--rule-hairline)] px-[var(--cell-x)] py-[var(--cell-y)]
                    align-middle text-[length:var(--density-body)] text-[var(--ink-2)]
                    ${c.mono ? "font-mono tabular-nums" : ""}
                    ${c.align === "right" ? "text-right tabular-nums text-[var(--ink)]" : c.align === "center" ? "text-center" : "text-left"}
                    ${c.clamp === 2 ? "whitespace-normal [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden" : "truncate"}
                    ${stickyFirst && ci === 0 ? "sticky left-0 bg-[var(--page)] group-hover:bg-[var(--sunken)]" : ""}`}
                  style={c.clamp === 2 ? { height: "var(--row-h-2)" } : undefined}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
