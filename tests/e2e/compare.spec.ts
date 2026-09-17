import { test, expect } from "./fixtures";
import { SAMPLE_JOB, SAMPLE_RESUME, skipTour } from "./helpers";

const LEVER = "https://jobs.lever.co/northwind/5ac2d7a4-0000-4000-8000-000000000001";
const SCAM = "Vaga de assistente administrativo home office, sem experiência. É necessário pagar a taxa de R$ 60 do curso de capacitação. Interessados chamar somente pelo WhatsApp.";
const SECOND = "Data Analyst at Globex. Responsibilities: build dashboards in Power BI, analyse funnels in SQL, support A/B tests and present insights to leadership. Requirements: 3 years of analytics.";

test.describe("job comparator", () => {
  test("import a Lever link, rank three jobs, save them to the tracker; five at most; a LinkedIn link gets the paste hint", async ({ page }) => {
    await page.goto("/compare");
    await skipTour(page);
    await page.goto("/compare");
    const cards = page.getByTestId("compare-posting");
    await cards.nth(0).getByTestId("compare-link").fill("https://www.linkedin.com/jobs/view/123456");
    await cards.nth(0).getByTestId("compare-import").click();
    await expect(cards.nth(0).getByTestId("compare-note")).toContainText("copy the job text");

    await cards.nth(0).getByTestId("compare-link").fill(LEVER);
    await cards.nth(0).getByTestId("compare-import").click();
    await expect(cards.nth(0).getByTestId("compare-text")).toHaveValue(/Run lifecycle campaigns in HubSpot/);
    await expect(cards.nth(0).getByTestId("compare-note")).toContainText("Lifecycle Marketing Manager");
    await cards.nth(1).getByTestId("compare-text").fill(SAMPLE_JOB);
    await page.getByTestId("compare-add").click();
    await cards.nth(2).getByTestId("compare-text").fill(SECOND);
    for (let i = 0; i < 2; i++) await page.getByTestId("compare-add").click();
    await expect(cards).toHaveCount(5);
    await expect(page.getByTestId("compare-add")).toBeDisabled();

    await page.getByTestId("compare-resume").fill(SAMPLE_RESUME);
    await page.getByTestId("compare-run").click();
    const results = page.getByTestId("compare-result");
    await expect(results).toHaveCount(3, { timeout: 30_000 });
    const scores = await results.evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-score"))));
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    for (let i = 0; i < 3; i++) await results.nth(i).getByTestId("compare-track").click();
    await expect(page.getByTestId("compare-track").filter({ hasText: "✓" })).toHaveCount(3);
    const apps = await (await page.request.get("/api/applications")).json();
    expect(apps.items.filter((a: { stage: string }) => a.stage === "saved")).toHaveLength(3);
    expect(apps.items.some((a: { link: string }) => a.link.includes("jobs.lever.co/northwind"))).toBe(true);
  });

  test("scam signs are flagged on /compare, /fit and the /start posting step", async ({ page }) => {
    await page.goto("/pt/comparar-vagas");
    await skipTour(page);
    await page.goto("/pt/comparar-vagas");
    await page.getByTestId("compare-posting").first().getByTestId("compare-text").fill(SCAM);
    await expect(page.getByTestId("scam-warning").first()).toContainText("Sinais de golpe");
    await page.goto("/fit");
    await page.getByTestId("fit-posting").fill(SCAM);
    await expect(page.getByTestId("scam-warning")).toContainText(/fake job|golpe/i);
    await expect(page.getByTestId("scam-warning")).toContainText(/No serious company|Nenhuma empresa séria/);
    await page.goto("/start");
    await page.getByTestId("via-text").click();
    await page.getByTestId("mode-tailor").click();
    await page.getByTestId("role").fill("Assistente");
    await page.getByTestId("next").click();
    await page.getByTestId("job").fill(SCAM);
    await expect(page.getByTestId("scam-warning")).toBeVisible();
    expect((await page.request.post("/api/jobs/import", { data: { url: "https://boards.greenhouse.io.evil.com/x/jobs/123" } })).status()).toBe(422);
  });
});
