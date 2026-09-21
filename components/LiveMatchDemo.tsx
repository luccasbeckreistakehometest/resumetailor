"use client";

import { useEffect, useState } from "react";
import { Meter, Token } from "@/components/ui";

const KW = ["Stakeholder mgmt", "Data analysis", "KPIs", "Roadmap", "Cross-functional", "Budget ownership"];
const FROM = 38;
const TO = 91;

/**
 * The landing demo (surface 10). It used to be a 128px conic-gradient donut in emerald against a
 * slate track, with the keywords as coloured pills — three colour systems that appear nowhere else
 * in the product. It is now the same Meter the kit screen uses and the same Tokens the coverage
 * table uses, so the page is showing the real object rather than an illustration of one.
 *
 * The loop is the only motion on the landing and it stops entirely under prefers-reduced-motion,
 * where it renders the finished state — which is also what the tests and the printed page see.
 */
export function LiveMatchDemo() {
  const [t, setT] = useState<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setT((v) => ((v ?? 0) + 1) % 78), 100);
    return () => clearInterval(id);
  }, []);

  // t === null: the finished state, which is what renders on the server and under reduced motion.
  const p = t === null ? 1 : t < 7 ? 0 : t < 35 ? (t - 7) / 28 : 1;
  const pct = Math.round(FROM + p * (TO - FROM));
  const revealed = p === 0 ? 0 : Math.min(KW.length, Math.floor(p * KW.length) + 1);
  const done = p === 1;

  return (
    <figure className="m-0 border border-[var(--rule)] bg-[var(--raised)]">
      <figcaption className="flex items-center justify-between gap-[var(--s-4)] border-b border-[var(--rule-hairline)] px-[var(--s-6)] py-[var(--s-4)]">
        <span className="truncate font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink-2)]">Senior Product Manager</span>
        <span
          className="shrink-0 font-mono text-[length:var(--mn-13)] tabular-nums"
          style={{ color: done ? "var(--kept)" : "var(--ink-muted)" }}
          aria-live="off"
        >
          {done ? "tailored" : "reading…"}
        </span>
      </figcaption>

      <div className="px-[var(--s-6)] py-[var(--s-6)]">
        <Meter label="Match" value={pct} before={FROM} caption={`${FROM}% before the rewrite · 6 of the job's terms`} />

        <p className="mt-[var(--s-6)] font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink-2)]">Keywords the job screens for</p>
        <ul className="mt-[var(--s-3)] flex flex-wrap gap-[var(--s-2)]">
          {KW.map((k, i) => (
            <li key={k}>
              <Token state={revealed > i ? "kept" : "missing"}>{k}</Token>
            </li>
          ))}
        </ul>
      </div>

      <p className="border-t border-[var(--rule-hairline)] px-[var(--s-6)] py-[var(--s-4)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">
        Resume, cover letter and LinkedIn About — <span className="text-[color:var(--ink-2)]">ready in 30 seconds</span>
      </p>
    </figure>
  );
}
