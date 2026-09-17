import { test, expect } from "./fixtures";
import { skipTour, unlockedTailorKit } from "./helpers";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

test.describe("follow-up radar, calendar and brief", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("an application from 8 days ago asks for a follow-up; copy works; 'I sent it' clears it", async ({ page }) => {
    await page.goto("/");
    await skipTour(page);
    const created = await page.request.post("/api/applications", { data: { company: "Globex", role: "Data Analyst", stage: "applied", appliedAt: daysAgo(8), contactName: "Marta" } });
    expect(created.status()).toBe(200);
    await page.goto("/applications");
    const alert = page.getByTestId("radar-alert").filter({ hasText: "Globex" });
    await expect(alert).toHaveAttribute("data-kind", "followup");
    await expect(alert).toContainText("8 days without an answer");
    await alert.getByTestId("radar-copy").click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain("Following up — Data Analyst application");
    expect(text).toContain("Globex");
    await expect(alert.getByTestId("radar-mail")).toHaveAttribute("href", /^mailto:\?subject=Following%20up/);
    await alert.getByTestId("radar-sent").click();
    await expect(page.getByTestId("radar-alert").filter({ hasText: "Globex" })).toHaveCount(0);
  });

  test("interview time → calendar file; brief shows the kit's points; strangers get 404", async ({ page, browser }) => {
    const { id: kitId } = await unlockedTailorKit(page);
    const start = new Date(Date.now() + 26 * 3600_000);
    start.setUTCSeconds(0, 0);
    const res = await page.request.post("/api/applications", { data: { company: "Contoso", role: "Growth Marketing Manager", stage: "interview", generationId: kitId } });
    const app = (await res.json()).item;
    expect((await page.request.patch(`/api/applications/${app.id}`, { data: { interviewAtTime: start.toISOString() } })).status()).toBe(200);

    const ics = await page.request.get(`/api/applications/${app.id}/ics?kind=interview&lang=pt`);
    expect(ics.headers()["content-type"]).toContain("text/calendar");
    const body = await ics.text();
    expect(body).toContain(`DTSTART:${start.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`);
    expect(body).toContain("SUMMARY:Entrevista: Contoso — Growth Marketing Manager");
    expect(body.match(/BEGIN:VALARM/g)).toHaveLength(2);

    await page.goto("/applications");
    await expect(page.getByTestId("radar-alert").filter({ hasText: "Contoso" })).toHaveAttribute("data-kind", "prep");
    await page.getByTestId("radar-alert").filter({ hasText: "Contoso" }).getByTestId("radar-brief").click();
    await expect(page.getByTestId("brief-story")).toContainText("The 38% pipeline story");
    await expect(page.getByTestId("brief-ask")).toContainText("How is marketing pipeline attributed today?");
    await expect(page.getByTestId("brief-when")).not.toBeEmpty();

    const other = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.203.0.4" } });
    expect((await other.request.get(`http://localhost:3100/api/applications/${app.id}/brief`)).status()).toBe(404);
    expect((await other.request.get(`http://localhost:3100/api/applications/${app.id}/ics?kind=interview`)).status()).toBe(404);
    expect((await other.request.post(`http://localhost:3100/api/applications/${app.id}/contact`, { data: { kind: "followup" } })).status()).toBe(404);
    await other.close();
  });
});
