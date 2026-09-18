"use client";

import { sparkline } from "@/lib/interview/trend";

/** Inline SVG line of session scores, 0–10. No chart library for one line. */
export function TrendChart({ values, width = 160, height = 40, className = "", testId }: { values: number[]; width?: number; height?: number; className?: string; testId?: string }) {
  const { path, dots } = sparkline(values, width, height);
  const up = values.length > 1 && values[values.length - 1] >= values[0];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} role="img" aria-label={values.join(", ")} data-testid={testId}>
      <line x1="4" x2={width - 4} y1={height - 4} y2={height - 4} stroke="var(--rule)" strokeWidth="1" />
      {path && <path d={path} fill="none" stroke={up ? "var(--kept)" : "var(--mark)"} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
      {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={i === dots.length - 1 ? 3.5 : 2.5} fill={i === dots.length - 1 ? "var(--ink)" : "var(--raised)"} stroke="var(--ink)" strokeWidth="1.5" />)}
    </svg>
  );
}
