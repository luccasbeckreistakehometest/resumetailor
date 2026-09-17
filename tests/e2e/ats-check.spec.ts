import { test, expect } from "./fixtures";
import { skipTour } from "./helpers";

const WEAK = `curriculum vitae
alex ribeiro
i am a hard working marketing person who likes teams and results and growth and learning new things every day.
i worked at some companies doing marketing and campaigns and reports for several managers over the years.
i studied marketing at a good university and did well.`;

const STRONG = `Alex Ribeiro
alex@example.com · +55 11 99999-0000 · linkedin.com/in/alexribeiro · São Paulo

Summary
Growth marketing lead with 6 years driving lifecycle programmes across three markets.

Experience
Growth Lead — Acme (Jan 2021 – Present)
- Grew qualified pipeline 38% YoY through lifecycle campaigns in HubSpot
- Led a team of 4 across paid, CRM and content, cutting CAC by 22%
- Ran 40+ A/B tests a year; lifted trial-to-paid conversion from 9% to 14%
- Built the attribution model in SQL that sales now uses for pipeline reviews
Marketing Analyst — Globex (Mar 2019 – Dec 2020)
- Owned weekly reporting for a $2M media budget
- Automated 12 dashboards, saving the team 6 hours a week

Education
BA Marketing, Universidade de São Paulo, 2018

Skills
HubSpot · SQL · A/B testing · Attribution · Copywriting · English (fluent)
${Array.from({ length: 12 }, (_, i) => `- Delivered project ${i + 1} on time with measurable impact for the business team`).join("\n")}`;

const POSTING = `Growth Marketing Manager
We are looking for a Growth Marketing Manager to own lifecycle marketing and paid acquisition.
Requirements: 5+ years of growth marketing experience; hands-on HubSpot and SQL; A/B testing; attribution modelling; team leadership.
You will run lifecycle marketing programmes, manage paid acquisition budgets, and report on pipeline. Experience with Salesforce is a plus.`;

test.describe("free ATS check", () => {
  test("scores a paste without an account, ranks the fixes, matches keywords, and shares a card", async ({ page, context }) => {
    const apiCalls: string[] = [];
    const beacons: string[] = [];
    page.on("request", (r) => {
      if (!r.url().includes("/api/")) return;
      apiCalls.push(new URL(r.url()).pathname);
      if (new URL(r.url()).pathname === "/api/e") beacons.push(r.postDataBuffer()?.toString() ?? "");
    });
    await page.goto("/ats-check");
    await skipTour(page);
    await page.goto("/ats-check");
    await expect(page.locator("h1")).toContainText(/ATS/i);

    await page.getByTestId("ats-check").click();
    await expect(page.getByTestId("ats-error")).toBeVisible();

    await page.getByTestId("ats-resume").fill(WEAK);
    await page.getByTestId("ats-check").click();
    await expect(page.getByTestId("ats-result")).toBeVisible();
    const weak = Number(await page.getByTestId("ats-score").innerText());
    expect(weak).toBeLessThan(50);
    expect(await page.getByTestId("ats-fix").count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByTestId("ats-fix").first()).toHaveAttribute("data-check", /quantified|experience|contact/);
    await expect(page.getByTestId("kw-matched")).toBeHidden();

    await page.getByTestId("ats-resume").fill(STRONG);
    await page.getByTestId("ats-posting").fill(POSTING);
    await page.getByTestId("ats-check").click();
    const strong = Number(await page.getByTestId("ats-score").innerText());
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThanOrEqual(85);
    await expect(page.getByTestId("ats-grade")).toHaveAttribute("data-grade", "A");
    await expect(page.getByTestId("kw-matched")).toContainText("hubspot");
    await expect(page.getByTestId("ats-cta")).toBeVisible();

    // The share link carries only the result: opening it elsewhere shows the card, never the text.
    const url = await page.getByTestId("share-url").inputValue();
    expect(url).toMatch(/\/ats-check\?r=/);
    const other = await context.newPage();
    await other.goto(url);
    await expect(other.getByTestId("share-card")).toContainText(String(strong));
    expect(url).not.toContain("HubSpot");

    // Nothing about the résumé went to the server.
    // The résumé never leaves the browser: only first-party analytics beacons (no text in them) go out.
    expect(apiCalls.filter((p) => !["/api/auth/me", "/api/tour", "/api/e"].includes(p))).toEqual([]);
    for (const b of beacons) expect(b).not.toMatch(/HubSpot|pipeline|Acme/i);
  });

  test("/ats-check/pt is served in Portuguese with Gupy tips; sitemap and robots cover it", async ({ page, request }) => {
    const html = await (await request.get("/ats-check/pt")).text();
    expect(html).toContain("Seu currículo passa na triagem da Gupy?");
    expect(html).toMatch(/hreflang="pt-BR"/i);   // React serialises the prop as hrefLang; attribute names are case-insensitive
    expect(html).toContain("<title>Teste de currículo pra ATS e Gupy");
    await page.goto("/ats-check/pt");
    await skipTour(page);
    await page.goto("/ats-check/pt");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("button", { name: "PT" })).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("ats-resume").fill(STRONG);
    await page.getByTestId("ats-check").click();
    await expect(page.getByTestId("ats-tips")).toContainText(/Gupy/);
    await expect(page.getByTestId("ats-fix").first().or(page.getByText(/Nada crítico/))).toBeVisible();

    const es = await (await request.get("/ats-check/es")).text();
    expect(es).toContain("¿Tu CV pasa el filtro del ATS?");
    expect((await request.get("/ats-check/de")).status()).toBe(404);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/ats-check/pt");
    expect(sitemap).toContain("/ats-check/es");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap:");
    expect(robots).toContain("/admin");
  });
});
