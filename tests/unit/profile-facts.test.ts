import { describe, expect, it } from "vitest";
import { emptyFacts, factsCount, factsText, mergeFacts, parseFacts, splitList } from "@/lib/profile/facts";

describe("profile facts", () => {
  it("merges without duplicates, ignoring case, accents and spacing", () => {
    const a = { ...emptyFacts(), tools: ["Power BI", "Excel"], achievements: ["Aumentei a retenção em 12%"] };
    const b = { ...emptyFacts(), tools: ["power  bi", "SQL"], achievements: ["aumentei a retencao em 12%."] };
    const m = mergeFacts(a, b);
    expect(m.tools).toEqual(["Power BI", "Excel", "SQL"]);
    expect(m.achievements).toHaveLength(1);
    expect(factsCount(m)).toBe(4);
  });

  it("keeps the newest answer for the same bullet and value, and drops empty figures", () => {
    const a = { ...emptyFacts(), numbers: [{ bullet: "Atendi clientes", value: "25", context: "por dia" }] };
    const b = { ...emptyFacts(), numbers: [{ bullet: "atendi clientes", value: "25", context: "clientes/dia" }, { bullet: "x", value: "", context: "" }] };
    expect(mergeFacts(a, b).numbers).toEqual([{ bullet: "atendi clientes", value: "25", context: "clientes/dia" }]);
  });

  it("reads stored JSON tolerantly and renders prompt text", () => {
    expect(parseFacts("not json")).toEqual(emptyFacts());
    const f = parseFacts(JSON.stringify({ tools: ["SQL", 3], numbers: [{ value: "38%", context: "pipeline" }] }));
    expect(f.tools).toEqual(["SQL"]);
    expect(factsText(f)).toContain("Figure: 38% (pipeline)");
  });

  it("splits spoken lists", () => {
    expect(splitList("Excel, Power BI e SQL")).toEqual(["Excel", "Power BI", "SQL"]);
  });
});
