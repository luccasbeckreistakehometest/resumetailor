import { test, expect } from "./fixtures";
import { tailorKitByText, unlockedTailorKit } from "./helpers";

test.describe("missing numbers", () => {
  test("two questions; an answer lands in its bullet, skipped ones are not sent; one round per kit", async ({ page }) => {
    const { id } = await unlockedTailorKit(page);
    const card = page.getByTestId("quantify");
    await expect(card.getByTestId("quantify-ask")).toHaveCount(2);
    await card.getByTestId("quantify-value").first().fill("25");
    await card.getByTestId("quantify-context").first().fill("clientes/dia");
    await card.getByTestId("quantify-skip").nth(1).check();
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().endsWith(`/api/generations/${id}/quantify`)),
      card.getByTestId("quantify-submit").click(),
    ]);
    expect(JSON.parse(req.postData() ?? "{}")).toEqual({ answers: [{ index: 0, value: "25", context: "clientes/dia" }] });
    await expect(page.getByTestId("quantify-done")).toContainText(/1 bullet/);

    const print = await page.context().newPage();
    await print.goto(`/print?id=${id}`);
    await expect(print.getByTestId("document")).toContainText("Led a team of 4 across paid, CRM and content — 25 clientes/dia");

    const versions = await (await page.request.get(`/api/generations/${id}/versions`)).json();
    expect(versions.items.map((v: { source: string }) => v.source)).toEqual(["quantify", "ai"]);
    const kit = await (await page.request.get(`/api/generations/${id}`)).json();
    expect(kit.checks.truth.items.some((i: { text: string }) => i.text === "25")).toBe(false);
    expect(kit.quantify.left).toBe(0);
    const again = await page.request.post(`/api/generations/${id}/quantify`, { data: { answers: [{ index: 1, value: "12", context: "" }] } });
    expect(again.status()).toBe(429);
    // The figure joined the saved profile's facts.
    const profile = await (await page.request.get("/api/profile")).json();
    expect(profile.profile.facts.numbers).toEqual([{ bullet: "Led a team of 4 across paid, CRM and content", value: "25", context: "clientes/dia" }]);
  });

  test("bullets already rewritten in the editor are not sent to the AI, and the round is kept", async ({ page }) => {
    const { id } = await unlockedTailorKit(page);
    const kit = await (await page.request.get(`/api/generations/${id}`)).json();
    const asks = kit.quantify.asks as { bullet: string }[];
    let edited = kit.kit.resume as string;
    asks.forEach((a, i) => { edited = edited.replace(a.bullet, `Rewritten by hand, line ${i + 1}`); });
    expect((await page.request.patch(`/api/generations/${id}/resume`, { data: { resume: edited } })).status()).toBe(200);
    for (let i = 0; i < 3; i++) {
      const res = await page.request.post(`/api/generations/${id}/quantify`, { data: { answers: [{ index: 0, value: "25", context: "" }] } });
      expect(res.status()).toBe(409);
      expect((await res.json()).error).toBe("bullet_changed");
    }
    const after = await (await page.request.get(`/api/generations/${id}`)).json();
    expect(after.quantify.left).toBe(1);
    const versions = await (await page.request.get(`/api/generations/${id}/versions`)).json();
    expect(versions.items.map((v: { source: string }) => v.source)).not.toContain("quantify");
  });

  test("a locked kit shows only how many questions there are", async ({ page }) => {
    const id = await tailorKitByText(page);
    await expect(page.getByTestId("quantify-teaser")).toContainText("2 quick questions");
    const kit = await (await page.request.get(`/api/generations/${id}`)).json();
    expect(kit.quantify).toMatchObject({ count: 2, asks: null });
    expect((await page.request.post(`/api/generations/${id}/quantify`, { data: { answers: [{ index: 0, value: "3" }] } })).status()).toBe(403);
  });
});
