import { DIMENSIONS, type Dimension, type Scores } from "@/lib/interview/logic";

/**
 * How interview practice evolves over time. No AI: pure arithmetic over saved sessions, so the
 * page and the library card show the same numbers and the unit tests pin them down.
 */
export interface SessionPoint {
  id: string; generationId: string; kitTitle: string; targetRole: string; createdAt: string; mode: string;
  answered: number; overall: number; averages: Scores;
}
export interface KitSeries { generationId: string; kitTitle: string; targetRole: string; points: SessionPoint[]; latest: SessionPoint; first: SessionPoint; delta: number }
export interface Trend {
  sessions: number; answers: number;
  points: SessionPoint[];                          // every answered session, oldest first
  latest: SessionPoint | null; first: SessionPoint | null;
  /** latest overall minus first overall, one decimal; 0 with fewer than two sessions */
  delta: number;
  averages: Scores;                                // weighted by answers across all sessions
  strongest: Dimension | null; weakest: Dimension | null;
  kits: KitSeries[];
  /** where to practise next: the weakest dimension, on the kit whose latest run scored lowest */
  next: { dimension: Dimension; generationId: string; kitTitle: string } | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Sessions with at least one scored answer, oldest first. Unanswered ones say nothing about progress. */
export function buildTrend(input: SessionPoint[]): Trend {
  const points = input.filter((s) => s.answered > 0).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const answers = points.reduce((a, p) => a + p.answered, 0);
  const empty: Scores = { structure: 0, specificity: 0, relevance: 0 };
  if (!points.length) return { sessions: 0, answers: 0, points, latest: null, first: null, delta: 0, averages: empty, strongest: null, weakest: null, kits: [], next: null };
  const averages = { ...empty };
  for (const d of DIMENSIONS) averages[d] = round1(points.reduce((a, p) => a + p.averages[d] * p.answered, 0) / answers);
  let strongest: Dimension = "structure", weakest: Dimension = "structure";
  for (const d of DIMENSIONS) { if (averages[d] > averages[strongest]) strongest = d; if (averages[d] < averages[weakest]) weakest = d; }
  const byKit = new Map<string, SessionPoint[]>();
  for (const p of points) byKit.set(p.generationId, [...(byKit.get(p.generationId) ?? []), p]);
  const kits: KitSeries[] = [...byKit.values()].map((ps) => ({ generationId: ps[0].generationId, kitTitle: ps[ps.length - 1].kitTitle, targetRole: ps[ps.length - 1].targetRole, points: ps, latest: ps[ps.length - 1], first: ps[0], delta: round1(ps[ps.length - 1].overall - ps[0].overall) }))
    .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt));
  const lowest = [...kits].sort((a, b) => a.latest.overall - b.latest.overall || b.latest.createdAt.localeCompare(a.latest.createdAt))[0];
  const latest = points[points.length - 1], first = points[0];
  return {
    sessions: points.length, answers, points, latest, first, delta: points.length > 1 ? round1(latest.overall - first.overall) : 0,
    averages, strongest, weakest, kits, next: { dimension: weakest, generationId: lowest.generationId, kitTitle: lowest.kitTitle },
  };
}

/** An SVG polyline for values on a 0–10 scale; a single value draws as a short flat line so the dot has a line under it. */
export function sparkline(values: number[], width = 160, height = 40, pad = 4): { path: string; dots: { x: number; y: number }[] } {
  if (!values.length) return { path: "", dots: [] };
  const vs = values.length === 1 ? [values[0], values[0]] : values;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (vs.length - 1);
  const y = (v: number) => height - pad - (Math.max(0, Math.min(10, v)) / 10) * (height - pad * 2);
  const pts = vs.map((v, i) => ({ x: round1(x(i)), y: round1(y(v)) }));
  return { path: pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" "), dots: values.length === 1 ? [pts[1]] : pts };
}

/** From what the sessions API returns to what the trend needs. */
export function toPoint(s: { id: string; generationId: string; kitTitle: string; targetRole: string; createdAt: string; mode: string; aggregate: { answered: number; overall: number; averages: Scores } }): SessionPoint {
  return { id: s.id, generationId: s.generationId, kitTitle: s.kitTitle, targetRole: s.targetRole, createdAt: s.createdAt, mode: s.mode, answered: s.aggregate.answered, overall: s.aggregate.overall, averages: s.aggregate.averages };
}
