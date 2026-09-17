import { describe, expect, it } from "vitest";
import { blankEntry, listItems, normaliseMd, parseEntryHeader, parseResume, renderEntryHeader, serialiseResume, splitDates } from "@/lib/resume/sections";
import { mockKit } from "@/lib/ai/kit";

const PT = `# Mariana Souza
Analista de Dados · mariana@example.com · Recife, PE

## Resumo
Analista de dados com 4 anos de experiência em varejo.

## Experiência Profissional
### Analista de Dados | Lojas Beira-Mar | jan 2022 – atual
- Reduzi o tempo do relatório semanal de 6h para 40 min com Power BI
- Automatizei a conciliação de estoque em Python

### Estagiária de BI | Banco Nordeste | 2020 – 2021
- Mantive 12 dashboards de crédito

## Formação
**Bacharelado em Estatística — UFPE** (2016–2020)

## Idiomas
Inglês avançado · Espanhol intermediário

## Competências
SQL, Python, Power BI, Excel
`;

const ES = `# Diego Fernández
Product Designer — diego@example.com

## Perfil profesional
Diseñador con foco en investigación.

## Experiencia
**Product Designer**, Mercado Libre — Mar 2021 – Presente
Lideré el rediseño del checkout.
- Aumenté la conversión un 7%

**UX Designer**, Globant — 2018 – 2021
- Entrevisté a 40 usuarios

## Educación
Diseño Industrial, Universidad de Buenos Aires, 2012–2017
`;

describe("résumé sections", () => {
  it("round-trips the mock kit byte for byte (after whitespace normalisation)", () => {
    const md = mockKit({ mode: "tailor", targetRole: "Growth Lead", lang: "en" }).resume;
    const p = parseResume(md)!;
    expect(p.name).toBe("Alex Ribeiro");
    const exp = p.sections.find((s) => s.kind === "experience")!;
    expect(exp.entries![0]).toMatchObject({ title: "Growth Lead", org: "Acme", dates: "2021–2026" });
    expect(exp.entries![0].items.map((i) => i.text)).toEqual(["Grew qualified pipeline 38% YoY through lifecycle campaigns", "Led a team of 4 across paid, CRM and content"]);
    expect(normaliseMd(serialiseResume(p))).toBe(normaliseMd(md));
  });

  it("reads Portuguese and Spanish layouts and round-trips them", () => {
    for (const md of [PT, ES]) expect(normaliseMd(serialiseResume(parseResume(md)!))).toBe(normaliseMd(md));
    const pt = parseResume(PT)!;
    expect(pt.sections.map((s) => s.kind)).toEqual(["summary", "experience", "education", "languages", "skills"]);
    expect(pt.sections[1].entries!.map((e) => [e.title, e.org, e.dates])).toEqual([["Analista de Dados", "Lojas Beira-Mar", "jan 2022 – atual"], ["Estagiária de BI", "Banco Nordeste", "2020 – 2021"]]);
    expect(pt.sections[2].entries![0]).toMatchObject({ title: "Bacharelado em Estatística", org: "UFPE", dates: "2016–2020" });
    const es = parseResume(ES)!;
    expect(es.sections[1].entries![0]).toMatchObject({ title: "Product Designer", org: "Mercado Libre", dates: "Mar 2021 – Presente" });
    expect(es.sections[1].entries![0].items[0]).toMatchObject({ kind: "text", text: "Lideré el rediseño del checkout." });
  });

  it("applies edits where they belong", () => {
    const p = parseResume(PT)!;
    const e = p.sections[1].entries![0];
    e.title = "Analista de Dados Sênior";
    e.items[0].text = "Reduzi o relatório semanal de 6h para 40 min";
    e.items.push({ kind: "bullet", text: "Novo bullet", marker: "- " });
    p.sections[1].entries!.push({ ...blankEntry(e), title: "Freelancer", org: "", dates: "2019" });
    const out = serialiseResume(p);
    expect(out).toContain("### Analista de Dados Sênior | Lojas Beira-Mar | jan 2022 – atual\n- Reduzi o relatório semanal de 6h para 40 min");
    expect(out).toContain("- Novo bullet");
    expect(out).toContain("### Freelancer | 2019");
  });

  it("returns null for text without headings, and parses header helpers", () => {
    expect(parseResume("just a paragraph\n- and a bullet")).toBeNull();
    expect(renderEntryHeader(parseEntryHeader("**Growth Lead — Acme** (2021–2026)"))).toBe("**Growth Lead — Acme** (2021–2026)");
    expect(renderEntryHeader({ ...parseEntryHeader("**Growth Lead — Acme** (2021–2026)"), dates: "" })).toBe("**Growth Lead — Acme**");
    expect(parseEntryHeader("Acme 2021–2026").org).toBe("");
    expect(splitDates("2021–2026")).toEqual(["2021", "2026"]);
    expect(splitDates("Jan 2024 – Present")).toEqual(["Jan 2024", "Present"]);
    expect(listItems("HubSpot · SQL · A/B testing")).toEqual(["HubSpot", "SQL", "A/B testing"]);
  });
});
