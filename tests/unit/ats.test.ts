import { describe, expect, it } from "vitest";
import { atsCheck, decodeShare, encodeShare, extractKeywords, keywordOverlap, related, wordCount } from "@/lib/ats/check";

const STRONG_EN = `Alex Ribeiro
alex@example.com · +55 11 99999-0000 · linkedin.com/in/alexribeiro · São Paulo

## Summary
Growth marketing lead with 6 years driving lifecycle programmes across three markets.

## Experience
**Growth Lead — Acme** (Jan 2021 – Present)
- Grew qualified pipeline 38% YoY through lifecycle campaigns in HubSpot
- Led a team of 4 across paid, CRM and content, cutting CAC by 22%
- Ran 40+ A/B tests a year; lifted trial-to-paid conversion from 9% to 14%
- Built the attribution model in SQL that sales now uses for pipeline reviews

**Marketing Analyst — Globex** (Mar 2019 – Dec 2020)
- Owned weekly reporting for a $2M media budget
- Automated 12 dashboards, saving the team 6 hours a week

## Education
BA Marketing, Universidade de São Paulo, 2018

## Skills
HubSpot · SQL · A/B testing · Attribution · Copywriting · English (fluent)
` + Array.from({ length: 12 }, (_, i) => `- Delivered project ${i + 1} on time with measurable impact for the business team`).join("\n");

const WEAK = `curriculum vitae
alex ribeiro
i am a hard working marketing person who likes teams and results and growth and learning new things every day.
i worked at some companies doing marketing and campaigns and reports for several managers over the years.
i studied marketing at a good university and did well.`;

const POSTING = `Growth Marketing Manager
We are looking for a Growth Marketing Manager to own lifecycle marketing and paid acquisition.
Requirements: 5+ years of growth marketing experience; hands-on HubSpot and SQL; A/B testing; attribution modelling; team leadership.
You will run lifecycle marketing programmes, manage paid acquisition budgets, and report on pipeline. Experience with Salesforce is a plus.`;

describe("ats heuristics", () => {
  it("scores a strong, well-structured résumé high and lists no high-severity fixes", () => {
    const r = atsCheck(STRONG_EN, POSTING);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.grade).toBe("A");
    expect(r.checks.find((c) => c.id === "contact")?.earned).toBe(8);
    expect(r.checks.find((c) => c.id === "experience")?.ok).toBe(true);
    expect(r.checks.find((c) => c.id === "skills")?.ok).toBe(true);
    expect(r.fixes.map((f) => f.id)).not.toEqual(expect.arrayContaining(["contact", "experience", "dates", "quantified"]));
    expect(r.checks.find((c) => c.id === "keywords")?.ok).toBe(true);
    expect(r.keywords.coverage).toBeGreaterThanOrEqual(60);
    expect(r.keywords.matched).toContain("hubspot");
  });

  it("scores a vague paragraph résumé low and puts contact and evidence first in the fix list", () => {
    const r = atsCheck(WEAK);
    expect(r.score).toBeLessThan(45);
    expect(r.grade).toBe("D");
    const ids = r.fixes.map((f) => f.id);
    expect(ids.slice(0, 4)).toEqual(expect.arrayContaining(["quantified", "experience", "contact"]));
    expect(r.hasPosting).toBe(false);
    expect(r.checks.find((c) => c.id === "keywords")).toBeUndefined();
  });

  it("recognises pt-BR and es section headings", () => {
    const pt = atsCheck(`Resumo profissional\nx\nExperiência profissional\n- Fiz 3 coisas em 2022\nFormação acadêmica\nx\nHabilidades\nx`);
    expect(pt.checks.filter((c) => ["summary", "experience", "education", "skills"].includes(c.id)).every((c) => c.ok)).toBe(true);
    const es = atsCheck(`Perfil profesional\nx\nExperiencia laboral\n- Hice 3 cosas en 2022\nFormación académica\nx\nHerramientas\nx`);
    expect(es.checks.filter((c) => ["summary", "experience", "education", "skills"].includes(c.id)).every((c) => c.ok)).toBe(true);
  });

  it("does not count a year as a quantified achievement", () => {
    const r = atsCheck(`Experience\n- Joined the team in 2021\n- Grew revenue 30% in 2022`);
    expect(r.stats.bullets).toBe(2);
    expect(r.stats.quantified).toBe(1);
  });

  it("flags table and column hints, icons, and personal data", () => {
    const r = atsCheck(`Alex\tRibeiro\nEmail:\tx@y.com\nPhone:\t+55 11 9\nCPF 000.000.000-00 · Estado civil: casado\n☎ +55 ✉ x@y.com ★ ★`);
    const by = Object.fromEntries(r.checks.map((c) => [c.id, c]));
    expect(by.format_tables.ok).toBe(false);
    expect(by.format_symbols.ok).toBe(false);
    expect(by.format_personal.ok).toBe(false);
  });

  it("returns zero for an empty paste", () => {
    expect(atsCheck("").score).toBe(0);
    expect(atsCheck("hello").score).toBe(0);
  });
});

describe("keywords", () => {
  it("keeps the posting's vocabulary, drops stopwords and boilerplate, and surfaces repeated phrases", () => {
    const kws = extractKeywords(POSTING);
    expect(kws).toContain("lifecycle marketing");
    expect(kws).toContain("hubspot");
    expect(kws).not.toContain("experience");
    expect(kws).not.toContain("the");
    expect(kws).not.toContain("requirements");
  });
  it("matches inflections and phrases", () => {
    const o = keywordOverlap("I managed attribution models and led lifecycle marketing programmes.", ["management", "attribution", "lifecycle marketing", "salesforce"]);
    expect(o.matched).toEqual(["management", "attribution", "lifecycle marketing"]);
    expect(o.missing).toEqual(["salesforce"]);
    expect(o.coverage).toBe(75);
  });
  it("relates inflections without matching unrelated prefixes", () => {
    expect(related("management", "managed")).toBe(true);
    expect(related("analyst", "analysis")).toBe(true);
    expect(related("marketing", "market")).toBe(true);
    expect(related("sales", "salesforce")).toBe(false);
    expect(related("data", "database")).toBe(false);
  });
  it("counts words the way a recruiter would", () => {
    expect(wordCount("C++ dev, 5 yrs — São Paulo/BR")).toBe(7);
  });
});

describe("share card", () => {
  it("round-trips score, grade, top fixes and coverage, never the text", () => {
    const r = atsCheck(WEAK);
    const token = encodeShare(r, "pt");
    expect(token).not.toContain("curriculum");
    const card = decodeShare(token)!;
    expect(card).toMatchObject({ s: r.score, g: r.grade, l: "pt", k: null });
    expect(card.f).toEqual(r.fixes.slice(0, 3).map((f) => f.id));
    expect(decodeShare("nope")).toBeNull();
    expect(decodeShare(btoa('{"s":"x"}'))).toBeNull();
  });
});
