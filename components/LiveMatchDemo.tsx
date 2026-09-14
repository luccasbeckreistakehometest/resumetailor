"use client";

import { useEffect, useState } from "react";

const KW = ["Stakeholder mgmt", "Data analysis", "KPIs", "Roadmap", "Cross-functional", "Budget ownership"];

export function LiveMatchDemo() {
  const [pct, setPct] = useState(38);
  const [revealed, setRevealed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let t = 0;
    const id = setInterval(() => {
      t = (t + 1) % 150; // ~7.5s loop at 50ms
      if (t < 14) {
        setDone(false);
        setPct(38);
        setRevealed(0);
      } else if (t < 56) {
        setDone(false);
        const p = (t - 14) / 42;
        setPct(Math.round(38 + p * (91 - 38)));
        setRevealed(Math.min(KW.length, Math.floor(p * KW.length) + 1));
      } else {
        setDone(true);
        setPct(91);
        setRevealed(KW.length);
      }
    }, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-edge bg-surface p-6 shadow-2xl shadow-indigo-950/40">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-paper-2 px-2.5 py-1 text-xs font-medium text-muted">Senior Product Manager</span>
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition " +
            (done ? "bg-moss-2 text-moss" : "bg-gold-2 text-oxblood")
          }
        >
          {done ? (
            "Tailored ✓"
          ) : (
            <>
              <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-edge border-t-indigo-600" />
              Analyzing…
            </>
          )}
        </span>
      </div>

      {/* Gauge */}
      <div className="mt-6 flex items-center gap-5">
        <div className="relative h-32 w-32 flex-none">
          <div
            className="h-full w-full rounded-full transition-all duration-100"
            style={{ background: `conic-gradient(#10b981 ${pct * 3.6}deg, #e2e8f0 0deg)` }}
          />
          <div className="absolute inset-[12px] flex flex-col items-center justify-center rounded-full bg-surface">
            <span className="text-3xl font-extrabold tabular-nums text-ink">{pct}%</span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">match</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted">
            Started at <span className="font-semibold text-muted">38%</span>
          </div>
          <div className="mt-1 text-sm font-semibold text-ink">Keywords the job screens for:</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {KW.map((k, i) => (
              <span
                key={k}
                className={
                  "rounded-full px-2 py-0.5 text-[11px] font-medium transition-all duration-300 " +
                  (revealed > i
                    ? "bg-moss-2 text-moss ring-1 ring-moss/30"
                    : "bg-paper text-paper-2 ring-1 ring-edge")
                }
              >
                {revealed > i ? "+ " : ""}
                {k}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-paper p-3 text-center text-xs text-muted">
        Resume + cover letter + LinkedIn — <span className="font-semibold text-ink-2">ready in 30s</span>
      </div>
    </div>
  );
}
