import { test, expect } from "./fixtures";
import { signUp, skipTour, tailorKitByText } from "./helpers";

const MULTILINE = `Alex Ribeiro
Growth Lead — Acme (2021–2026)
- Grew qualified pipeline 38% YoY through lifecycle campaigns
- Led a team of 4 across paid, CRM and content
- Ran weekly A/B tests in HubSpot
Skills: HubSpot, SQL, A/B testing`;

test.describe("truth check and what changed", () => {
  test("flags what the candidate never said; 'that's right' sticks; undo brings a line back into the print", async ({ page }) => {
    const id = await tailorKitByText(page, { resume: MULTILINE });
    // Locked: only counts, never the flagged text.
    await expect(page.getByTestId("truth-teaser")).toContainText(/checked/);
    const locked = await (await page.request.get(`/api/generations/${id}`)).json();
    expect(locked.checks.truth.pending).toBeGreaterThan(0);
    expect(locked.checks.truth.items).toBeNull();
    expect(locked.checks.human.hits).toBeNull();
    expect(JSON.stringify(locked.checks)).not.toContain("6 years");

    await page.getByTestId("unlock").click();
    await signUp(page);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });
    const card = page.getByTestId("truth-card");
    await expect(card).toBeVisible();
    const six = page.getByTestId("truth-item").filter({ hasText: "6 years" }).first();
    await expect(six).toHaveAttribute("data-kind", "number");
    const pendingBefore = Number(await card.getAttribute("data-pending"));
    await six.getByTestId("truth-ack").click();
    await expect(card).toHaveAttribute("data-pending", String(pendingBefore - 1));
    await page.goto(`/start?gen=${id}`);
    await expect(page.getByTestId("truth-item").filter({ hasText: "6 years" }).first()).toHaveAttribute("data-acked", "1");
    // Numbers the candidate gave are not flagged.
    await expect(page.getByTestId("truth-item").filter({ hasText: /^Number · 38%/ })).toHaveCount(0);
    await expect(page.getByTestId("human-card")).toBeVisible();

    await page.getByTestId("open-changes").click();
    await expect(page.getByTestId("changes")).toBeVisible();
    const removed = page.getByTestId("diff-row").filter({ hasText: "Ran weekly A/B tests in HubSpot" });
    await expect(removed).toHaveAttribute("data-kind", "del");
    await removed.getByTestId("diff-undo").click();
    await expect(page.getByTestId("save-state")).toContainText(/saved/i, { timeout: 10_000 });
    await expect(page.getByTestId("diff-row").filter({ hasText: "Ran weekly A/B tests in HubSpot" })).toHaveCount(0);
    const print = await page.context().newPage();
    await print.goto(`/print?id=${id}`);
    await expect(print.getByTestId("document")).toContainText("Ran weekly A/B tests in HubSpot");
  });

  test("the free ATS check scores 'sounds human' in the browser, with no network call", async ({ page }) => {
    await page.goto("/ats-check/pt");
    await skipTour(page);
    await page.goto("/ats-check/pt");
    const api: string[] = [];
    page.on("request", (r) => { if (new URL(r.url()).pathname.startsWith("/api/") && r.method() !== "GET") api.push(r.url()); });
    await page.getByTestId("ats-resume").fill(`Ana Lima\nana@example.com · +55 11 91234-5678\n\nResumo\nProfissional proativa, dinâmica e apaixonada por dados, com vasta experiência.\n\nExperiência\nAnalista — Acme (2019–2023)\n- Responsável por relatórios\n- Responsável por dashboards\n- Responsável por reuniões\n\nFormação\nEstatística — UFPE (2018)\n\nHabilidades\nSQL, Excel`);
    await page.getByTestId("ats-check").click();
    await expect(page.getByTestId("ats-result")).toBeVisible();
    const row = page.locator('[data-testid="ats-check-row"][data-check="human"]');
    await expect(row).toHaveAttribute("data-ok", "0");
    await expect(row).toContainText("Soa humano");
    expect(api).toEqual([]);
  });
});
