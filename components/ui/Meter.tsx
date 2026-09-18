"use client";

/**
 * The one Meter (docs/DESIGN.md §9.3). Match, personalisation and "sounds human" are the same
 * object and are drawn the same way; today they are three different designs on one screen.
 *
 *   <Meter label="Match" value={89} before={41} caption="was 41% before the rewrite" />
 *   <Meter label="Sounds human" value={100} max={100} caption="100 of 100 sentences pass" />
 *
 * Rules that are enforced here rather than remembered:
 *  · `caption` is required — a naked percentage means nothing and appears three times today.
 *  · Colour marks a THRESHOLD CROSSING, never the score itself. There is no red fill: red is a
 *    mark on the document, not a bad number.
 *  · The "before" value is a 2px tick that overshoots the track, not a second bar. At 1px it
 *    disappeared against a 4px track — found by rendering it and looking.
 *  · The fill grows once, on first appearance. A re-render does not replay it, and
 *    prefers-reduced-motion renders it at its final value.
 */
export function Meter({
  label, value, max = 100, before, caption, good = 75, poor = 40, unit = "%", className = "",
}: {
  label: string;
  value: number;
  max?: number;
  before?: number;
  /** What the number means. Required: every score carries its denominator or its baseline. */
  caption: string;
  good?: number;
  poor?: number;
  unit?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const beforePct = before === undefined ? null : Math.max(0, Math.min(100, (before / max) * 100));
  const fill = value >= good ? "var(--kept)" : value <= poor ? "var(--query)" : "var(--ink)";
  const id = `meter-${label.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-[var(--s-4)]">
        <span id={id} className="eyebrow">{label}</span>
        <span className="font-mono tabular-nums leading-none">
          <span className="text-[length:var(--mn-24)] font-medium tracking-[var(--mn-24-ls)] text-[color:var(--ink)]">{value}</span>
          {unit && <span className="ml-[1px] text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{unit}</span>}
        </span>
      </div>

      <div
        role="meter"
        aria-labelledby={id}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={`${value}${unit} — ${caption}`}
        className="relative mt-[var(--s-3)] h-1 w-full bg-[var(--sunken)]"
      >
        <span className="meter-fill absolute inset-y-0 left-0 block" style={{ width: `${pct}%`, background: fill }} />
        {beforePct !== null && (
          <span
            aria-hidden
            className="absolute -top-1 -bottom-1 w-[2px] bg-[var(--rule-field)]"
            style={{ left: `calc(${beforePct}% - 1px)` }}
          />
        )}
      </div>

      <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">
        {caption}
      </p>
    </div>
  );
}
