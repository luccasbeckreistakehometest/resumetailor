import { describe, expect, it } from "vitest";
import { buildTrend, sparkline, toPoint, type SessionPoint } from "@/lib/interview/trend";

const pt = (id: string, gen: string, day: number, overall: number, averages: [number, number, number], answered = 2): SessionPoint =>
  ({ id, generationId: gen, kitTitle: `Kit ${gen}`, targetRole: "Role", createdAt: `2026-09-${String(day).padStart(2, "0")}T10:00:00.000Z`, mode: "full", answered, overall, averages: { structure: averages[0], specificity: averages[1], relevance: averages[2] } });

describe("trend", () => {
  it("is empty-safe and ignores sessions with no scored answer", () => {
    const t = buildTrend([pt("a", "g1", 1, 0, [0, 0, 0], 0)]);
    expect(t.sessions).toBe(0); expect(t.latest).toBeNull(); expect(t.next).toBeNull(); expect(t.delta).toBe(0);
  });
  it("orders by date whatever the input order, and measures the delta from first to latest", () => {
    const t = buildTrend([pt("c", "g1", 20, 7.4, [7, 8, 7]), pt("a", "g1", 3, 4.1, [4, 4, 4]), pt("b", "g1", 10, 6, [6, 6, 6])]);
    expect(t.points.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(t.first!.id).toBe("a"); expect(t.latest!.id).toBe("c");
    expect(t.delta).toBe(3.3);
    expect(t.sessions).toBe(3); expect(t.answers).toBe(6);
  });
  it("weights dimension averages by answers, names strongest and weakest, and points the next rehearsal at the weakest kit", () => {
    const t = buildTrend([pt("a", "g1", 1, 5, [3, 6, 6], 1), pt("b", "g2", 2, 8, [8, 8, 8], 3), pt("c", "g1", 3, 6, [5, 6, 7], 2)]);
    // structure: (3·1 + 8·3 + 5·2) / 6 = 6.2 ; specificity: (6+24+12)/6 = 7 ; relevance: (6+24+14)/6 = 7.3
    expect(t.averages).toEqual({ structure: 6.2, specificity: 7, relevance: 7.3 });
    expect(t.strongest).toBe("relevance"); expect(t.weakest).toBe("structure");
    expect(t.kits.map((k) => k.generationId)).toEqual(["g1", "g2"]);   // most recently practised first
    expect(t.kits[0].delta).toBe(1);
    expect(t.next).toEqual({ dimension: "structure", generationId: "g1", kitTitle: "Kit g1" });
  });
  it("breaks ties towards structure, and a single session has no delta", () => {
    const t = buildTrend([pt("a", "g1", 1, 5, [5, 5, 5])]);
    expect(t.strongest).toBe("structure"); expect(t.weakest).toBe("structure"); expect(t.delta).toBe(0);
  });
  it("maps the sessions API shape", () => {
    const p = toPoint({ id: "s", generationId: "g", kitTitle: "K", targetRole: "R", createdAt: "2026-01-01T00:00:00.000Z", mode: "preview", aggregate: { answered: 2, overall: 6.5, averages: { structure: 6, specificity: 7, relevance: 6.5 } } });
    expect(p).toMatchObject({ answered: 2, overall: 6.5, mode: "preview" });
  });
});

describe("sparkline", () => {
  it("draws nothing for no values, a flat line with one dot for one value, and a path across the width for many", () => {
    expect(sparkline([])).toEqual({ path: "", dots: [] });
    const one = sparkline([5], 100, 40);
    expect(one.path).toBe("M4 20 L96 20");
    expect(one.dots).toEqual([{ x: 96, y: 20 }]);
    const many = sparkline([0, 10, 5], 100, 40);
    expect(many.path).toBe("M4 36 L50 4 L96 20");
    expect(many.dots).toHaveLength(3);
  });
  it("clamps out-of-range values to the 0–10 scale", () => {
    expect(sparkline([-3, 14], 100, 40).path).toBe("M4 36 L96 4");
  });
});
