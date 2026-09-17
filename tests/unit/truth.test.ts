import { describe, expect, it } from "vitest";
import { missingNumbers, numbersIn, truthCheck, userAddedLines } from "@/lib/ats/truth";
import { clicheCheck, promptBanList } from "@/lib/ats/cliche";
import { diffLines, undoRow } from "@/lib/text/diff";

const kit = (body: string) => `# Ana Lima\nana@example.com · +55 11 91234-5678\n\n## Experiência\n**Analista — Acme** (2019–2023)\n${body}\n`;

describe("truth check", () => {
  it("flags a number the candidate never gave, and accepts spacing and format variants", () => {
    const text = kit("- Aumentei vendas em 38%");
    expect(truthCheck({ kitText: text, sources: ["Analista na Acme de 2019 a 2023."] }).unverified.map((u) => u.text)).toEqual(["38%"]);
    expect(truthCheck({ kitText: text, sources: ["Analista na Acme 2019-2023, vendas +38 %"] }).unverified).toEqual([]);
  });

  it("checks years, employers, degrees and money in any notation", () => {
    const r = truthCheck({ kitText: kit("- Gerenciei orçamento de R$ 1.2M\n\n## Formação\nMBA em Finanças"), sources: ["Trabalhei 2019–2023 numa empresa. Orçamento de R$ 1,2 milhão."] });
    expect(r.unverified.map((u) => `${u.kind}:${u.text}`).sort()).toEqual(["degree:MBA", "org:Acme"]);
    expect(r.checked).toBeGreaterThan(4);
    // The contact line (phone, e-mail) is not a claim.
    expect(r.unverified.some((u) => /9123/.test(u.text))).toBe(false);
  });

  it("never lets a language level go up, and lists added skills to confirm", () => {
    const r = truthCheck({ kitText: kit("- Inglês fluente"), sources: ["Acme 2019 2023. Inglês intermediário."], addedSkills: ["Power BI", "SQL"] });
    expect(r.unverified.map((u) => u.kind).sort()).toEqual(["language", "skill", "skill"]);
    const ok = truthCheck({ kitText: kit("- Inglês avançado"), sources: ["Acme 2019 2023, inglês fluente, Power BI"], addedSkills: ["Power BI"] });
    expect(ok.unverified).toEqual([]);
  });

  it("parses numbers", () => {
    expect(numbersIn("R$ 1,2 milhão")[0].value).toBe(1_200_000);
    expect(numbersIn("$12M")[0].value).toBe(12_000_000);
    expect(numbersIn("3x faster")[0].unit).toBe("x");
    expect(numbersIn("team of four").some((n) => n.value === 4)).toBe(true);
  });

  it("counts what the person typed in the editor as theirs, and finds numbers a rewrite dropped", () => {
    expect(userAddedLines([{ text: "a\nb", source: "ai" }, { text: "a\nb\n- 25 clientes/dia", source: "user" }])).toBe("- 25 clientes/dia");
    // A typo fix on a line with an AI number: only the new word is theirs, so the 40% stays flagged.
    const ai = kit("- Aumentei as vendas em 40% com a equpe");
    const edited = kit("- Aumentei as vendas em 40% com a equipe de 5 pessoas");
    const typed = userAddedLines([{ text: ai, source: "ai" }, { text: edited, source: "user" }]);
    expect(typed).toBe("equipe de 5 pessoas");
    expect(truthCheck({ kitText: edited, sources: ["Analista na Acme de 2019 a 2023.", typed] }).unverified.map((u) => u.text)).toEqual(["40%"]);
    expect(missingNumbers("Grew pipeline 38% in 2024", "Grew pipeline in 2024")).toEqual(["38%"]);
  });
});

describe("sounds human", () => {
  it("finds the clichés in each language", () => {
    expect(clicheCheck("Profissional proativo e dinâmico.", "pt").hits).toHaveLength(2);
    expect(clicheCheck("Results-driven leader who spearheaded growth.", "en").hits).toHaveLength(2);
    expect(clicheCheck("Ingeniera proactiva y apasionada por los datos.", "es").hits).toHaveLength(2);
    expect(clicheCheck("Cut report time from 6h to 40 min.", "en").score).toBe(100);
  });
  it("flags repeated openers and vague bullets, and exposes a prompt ban list", () => {
    const r = clicheCheck("- Led A\n- Led B\n- Led C\n- Responsible for reports", "en");
    expect(r.patterns.map((p) => p.kind)).toEqual(["sameOpener", "vague"]);
    expect(r.score).toBeLessThan(100);
    expect(promptBanList("pt")).toHaveLength(15);
  });
});

describe("line diff", () => {
  it("marks one changed line for one edited bullet and undoes it", () => {
    const a = "Vendi muito\nAtendi clientes";
    const b = "## Experiência\n- Vendi muito\n- Atendi 25 clientes por dia";
    const rows = diffLines(a, b);
    expect(rows.filter((r) => r.kind === "change")).toHaveLength(1);
    expect(rows.filter((r) => r.kind === "same")).toHaveLength(1);
    const changed = rows.find((r) => r.kind === "change")!;
    expect(undoRow(b, changed)).toBe("## Experiência\n- Vendi muito\n- Atendi clientes");
    const added = rows.find((r) => r.kind === "add")!;
    expect(undoRow(b, added)).toBe("- Vendi muito\n- Atendi 25 clientes por dia");
  });
});

describe("quantify patch", () => {
  it("replaces only matched bullets and never duplicates a line", async () => {
    const { applyPatch } = await import("@/lib/ai/quantify");
    const text = "- Led a team\n- Served customers\n";
    const r = applyPatch(text, [
      { before: "Served customers", after: "Served 25 customers a day" },
      { before: "Not in the résumé", after: "x" },
      { before: "Led a team", after: "Served 25 customers a day" },
    ]);
    expect(r).toEqual({ text: "- Led a team\n- Served 25 customers a day\n", applied: 1 });
  });
});
