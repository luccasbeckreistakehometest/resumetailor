import { test, expect } from "./fixtures";
import { tailorKitByText, unlockedTailorKit } from "./helpers";

test.describe("résumé editor", () => {
  test("edit a bullet → it survives a reload and shows in print; versions list AI + you; back to the AI's version", async ({ page }) => {
    const { id } = await unlockedTailorKit(page);
    await page.getByTestId("edit-kit").click();
    await expect(page).toHaveURL(new RegExp(`/edit/${id}$`));
    const bullet = page.getByTestId("ed-bullet").first();
    await expect(bullet).toHaveValue("Grew qualified pipeline 38% YoY through lifecycle campaigns");
    await bullet.fill("Grew qualified pipeline 38% YoY with a lifecycle programme I designed");
    await expect(page.getByTestId("save-state")).toContainText(/saved/i, { timeout: 10_000 });
    await expect(page.getByTestId("edit-preview")).toContainText("lifecycle programme I designed");

    await page.reload();
    await expect(page.getByTestId("ed-bullet").first()).toHaveValue("Grew qualified pipeline 38% YoY with a lifecycle programme I designed");
    const print = await page.context().newPage();
    await print.goto(`/print?id=${id}`);
    await expect(print.getByTestId("document")).toContainText("lifecycle programme I designed");
    expect(await print.title()).toBe("Resume-Alex-Ribeiro-Growth-Marketing-Manager");

    await page.getByTestId("versions").locator("summary").click();
    await expect(page.getByTestId("version-item")).toHaveCount(2);
    await expect(page.getByTestId("version-item").first()).toHaveAttribute("data-source", "user");
    await expect(page.getByTestId("version-item").last()).toHaveAttribute("data-source", "ai");
    await page.getByTestId("back-to-ai").click();
    await expect(page.getByTestId("ed-bullet").first()).toHaveValue("Grew qualified pipeline 38% YoY through lifecycle campaigns");
    await print.reload();
    await expect(print.getByTestId("document")).toContainText("through lifecycle campaigns");
    await expect(page.getByTestId("version-item")).toHaveCount(3);

    // After an edit, the letters can be refreshed on request.
    await page.getByTestId("refresh-letters").click();
    await expect(page.getByRole("status").filter({ hasText: /next time/i })).toBeVisible();
  });

  test("Word and text downloads, named after the candidate", async ({ page }) => {
    const { id } = await unlockedTailorKit(page);
    const docx = await page.request.get(`/api/generations/${id}/export?doc=resume&format=docx`);
    expect(docx.status()).toBe(200);
    expect(docx.headers()["content-type"]).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(docx.headers()["content-disposition"]).toBe('attachment; filename="Resume-Alex-Ribeiro-Growth-Marketing-Manager.docx"');
    expect((await docx.body()).subarray(0, 2).toString()).toBe("PK");
    const txt = await page.request.get(`/api/generations/${id}/export?doc=cover&format=txt`);
    expect(txt.headers()["content-disposition"]).toContain("Cover-letter-Alex-Ribeiro");
    expect(await txt.text()).toContain("Dear Hiring Team");
    await page.goto(`/edit/${id}`);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("dl-resume-docx").click()]);
    expect(download.suggestedFilename()).toBe("Resume-Alex-Ribeiro-Growth-Marketing-Manager.docx");
  });

  test.describe("form mode", () => {
    test.use({ permissions: ["clipboard-read", "clipboard-write"] });
    test("one block per experience; copy puts the exact text on the clipboard", async ({ page }) => {
      const { id } = await unlockedTailorKit(page);
      await page.goto(`/edit/${id}`);
      await page.getByTestId("tab-form").click();
      await expect(page.getByTestId("form-experience")).toHaveCount(1);
      await expect(page.getByTestId("value-exp0-title")).toHaveText("Growth Lead");
      await expect(page.getByTestId("value-exp0-company")).toHaveText("Acme");
      await page.getByTestId("copy-exp0-title").click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Growth Lead");
      await page.getByTestId("copy-exp0-company").click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Acme");
    });
  });

  test("only the owner of an unlocked kit can edit or export it", async ({ page, browser }) => {
    const { id } = await unlockedTailorKit(page);
    expect((await page.request.patch(`/api/generations/${id}/resume`, { data: { resume: "x".repeat(20_001) } })).status()).toBe(400);

    const other = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.200.0.9" } });
    const stranger = await other.newPage();
    const lockedId = await tailorKitByText(stranger);
    expect((await stranger.request.patch(`/api/generations/${lockedId}/resume`, { data: { resume: "# Me\n\n## Summary\nhello" } })).status()).toBe(403);
    expect((await stranger.request.get(`/api/generations/${lockedId}/export?doc=resume&format=docx`)).status()).toBe(403);
    expect((await stranger.request.patch(`/api/generations/${id}/resume`, { data: { resume: "# Hijack\n\n## Summary\nno" } })).status()).toBe(404);
    expect((await stranger.request.get(`/api/generations/${id}/export?doc=resume&format=docx`)).status()).toBe(404);
    expect((await stranger.request.get(`/api/generations/${id}/versions`)).status()).toBe(404);
    await stranger.goto(`/edit/${lockedId}`);
    await expect(stranger.getByTestId("edit-locked")).toBeVisible();
    await other.close();
  });

  test("refreshing letters removes only the ones older than the last edit, a few times a day", async ({ page }) => {
    const { id } = await unlockedTailorKit(page);
    const letter = async () => (await (await page.request.post(`/api/generations/${id}/variants`, { data: { kind: "cover:formal" } })).json()).cached;
    const refresh = () => page.request.delete(`/api/generations/${id}/variants`);
    expect(await letter()).toBe(false);
    // Nothing edited yet: nothing to refresh, and nothing is counted.
    expect(await (await refresh()).json()).toEqual({ ok: true, removed: 0 });
    const base = (await (await page.request.get(`/api/generations/${id}`)).json()).kit.resume as string;
    for (let i = 0; i < 4; i++) {
      if (i > 0) expect(await letter()).toBe(false);                   // rewritten after the last refresh
      expect((await page.request.patch(`/api/generations/${id}/resume`, { data: { resume: `${base}\n- Edit number ${i}` } })).status()).toBe(200);
      const res = await refresh();
      if (i < 3) expect(await res.json()).toEqual({ ok: true, removed: 1 });
      else expect(res.status()).toBe(429);
    }
    expect(await letter()).toBe(true);                                  // the capped refresh removed nothing
  });
});
