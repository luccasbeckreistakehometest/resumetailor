import type { ReactNode } from "react";
import { Seal } from "./Panel";

/**
 * The names the product already imports from "@/components/ui", re-cut on the new type scale so
 * every screen inherits the system before its own rebuild lands (docs/DESIGN.md §14). They are
 * deleted surface by surface; do not reach for them in new work.
 */

/** The one uppercase style in the system. */
export const Eyebrow = ({ children }: { children: ReactNode }) => <p className="eyebrow">{children}</p>;

/** One display line per page. Never two. */
export const H1 = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <h1 className={`doc-45 text-[color:var(--ink)] lg:text-[length:var(--doc-64)] lg:leading-[var(--doc-64-lh)] lg:tracking-[var(--doc-64-ls)] ${className}`}>{children}</h1>
);

export const H2 = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <h2 className={`doc-31 text-[color:var(--ink)] ${className}`}>{children}</h2>
);

/** @deprecated Use <Seal>: same mark, the name the system uses. */
export const Stamp = ({ children }: { children: ReactNode }) => <Seal>{children}</Seal>;
