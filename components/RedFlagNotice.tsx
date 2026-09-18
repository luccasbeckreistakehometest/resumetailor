"use client";

import { useI18n } from "@/app/i18n/I18nProvider";
import { FEBRABAN_ALERT, redFlags } from "@/lib/jobs/redflags";

/** Warning signs in a pasted posting, computed in the browser. Signals, never accusations. */
export function RedFlagNotice({ text, postedAt, compact }: { text: string; postedAt?: string | null; compact?: boolean }) {
  const { r } = useI18n();
  const F = r.compare.flags;
  if (text.trim().length < 30) return null;
  const { level, flags } = redFlags(text, { postedAt });
  if (!level) return null;
  const high = level === "high";
  const shown = high ? flags.filter((f) => ["fee", "messaging", "freemail", "tasks", "data", "toogood"].includes(f)) : flags;
  return (
    <div className={"mt-3 rounded-xl px-4 py-3 text-sm " + (high ? "border border-oxblood bg-oxblood/5 text-ink" : "bg-paper-2 text-ink-2")} role={high ? "alert" : "note"} data-testid={high ? "scam-warning" : "soft-warning"}>
      <p className={"font-semibold " + (high ? "text-oxblood" : "text-ink")}>{high ? F.high : F.soft}</p>
      <ul className="mt-1 list-disc pl-5">{shown.map((f) => <li key={f}>{F.kinds[f]}</li>)}</ul>
      {high && !compact && <p className="mt-2">{F.highNote} <a href={FEBRABAN_ALERT} target="_blank" rel="noopener noreferrer" className="font-medium text-[color:var(--ink)] decoration-[var(--rule-field)] underline-offset-2 hover:underline">{F.alert} ↗</a></p>}
    </div>
  );
}
