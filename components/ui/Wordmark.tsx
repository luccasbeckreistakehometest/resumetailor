"use client";

import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";

/**
 * The wordmark (docs/DESIGN.md §7.4). A printer's mark — a square ink tile, because paper has
 * square corners — and the name set in the document face. The two halves are told apart by WEIGHT,
 * not by hue: red is a proofreader's mark in this system and a logo is not a correction.
 */
export function Logo({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { to } = useI18n();
  return (
    <Link href={to("home")} className={`flex shrink-0 items-center gap-[var(--s-3)] ${className}`} aria-label="ResumeTailor">
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-[var(--r-0)] bg-[var(--ink)] font-serif text-[15px] font-semibold leading-none text-[color:var(--on-ink)]"
        style={{ fontVariationSettings: '"opsz" 14' }}
      >
        R
      </span>
      {!compact && (
        <span className="font-serif text-[19px] font-semibold leading-none tracking-[-0.014em] text-[color:var(--ink)]">
          Resume<span className="font-normal text-[color:var(--ink-2)]">Tailor</span>
        </span>
      )}
    </Link>
  );
}
