import { test, expect } from "./fixtures";
import { buildKitByText, login, signUp, skipTour } from "./helpers";

const ADMIN = { email: "admin@resumetailor.app", password: "resumetailor2026" };

test.describe("support and admin tools", () => {
  test("contact form: stored for the admin, honeypot dropped, rate-limited per IP", async ({ page, browser }) => {
    await page.goto("/contact");
    await skipTour(page);
    const marker = `pix-${Date.now()}`;
    await page.getByTestId("contact-email").fill("visitor@example.com");
    await page.getByTestId("contact-topic").selectOption("payment");
    await page.getByTestId("contact-message").fill(`My Pix went through but no credits yet (${marker}).`);
    await page.getByTestId("contact-send").click();
    await expect(page.getByTestId("contact-sent")).toBeVisible();
    // No email/WhatsApp configured on this server: only the form is offered.
    await expect(page.getByTestId("contact-channels")).toHaveCount(0);

    // A bot filling the hidden field gets a 200 and nothing is stored.
    const bot = await page.request.post("/api/contact", { data: { email: "bot@example.com", message: `spam spam spam ${marker}-bot`, website: "http://spam" } });
    expect(bot.status()).toBe(200);

    // Five messages an hour per IP.
    const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.201.0.9" } });
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await ctx.request.post("http://localhost:3100/api/contact", { data: { email: "flood@example.com", message: `flood message number ${i}` } })).status());
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    await ctx.close();

    await login(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin");
    await page.getByRole("button", { name: /^Messages/ }).click();
    const item = page.getByTestId("admin-messages").locator("li", { hasText: marker }).first();
    await expect(item).toContainText("visitor@example.com");
    await expect(page.getByTestId("admin-messages")).not.toContainText(`${marker}-bot`);
    await item.getByRole("combobox").selectOption("done");
    await expect(item.getByRole("combobox")).toHaveValue("done");
  });

  test("admin: one-time password reset, disable, and takedown of a public résumé; users cannot use admin APIs", async ({ page, browser }) => {
    // A user with a published web résumé.
    await buildKitByText(page);
    await page.getByTestId("unlock").click();
    const user = await signUp(page);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("publish-toggle").check();
    await expect(page.getByTestId("publish-url")).toHaveValue(/\/cv\/[a-z0-9-]+$/);
    const url = await page.getByTestId("publish-url").inputValue();
    const slug = url.split("/cv/")[1];
    for (const path of ["/api/admin/overview", "/api/admin/users", "/api/admin/messages"]) expect((await page.request.get(path)).status()).toBe(403);
    expect((await page.request.post(`/api/admin/public/${slug}`, { data: { down: true } })).status()).toBe(403);
    await page.getByTestId("signout").click();

    await login(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin");
    await expect(page.getByTestId("admin-ai-status")).toHaveText("AI working");
    await expect(page.getByTestId("admin-spend")).toHaveText("$0.00");
    await page.getByTestId("admin-q").fill(user.email);
    await page.getByTestId("admin-search").click();
    await page.getByTestId(`admin-open-${user.email}`).click();
    await expect(page.getByTestId("admin-user")).toContainText(user.email);

    // Takedown: visitors get a 404 and the owner cannot switch it back on.
    await page.getByTestId(`admin-takedown-${slug}`).click();
    await expect(page.getByTestId(`admin-page-${slug}`)).toContainText("Taken down");
    const stranger = await browser.newContext();
    expect((await (await stranger.newPage()).goto(url))?.status()).toBe(404);
    await stranger.close();

    // Password reset: shown once, the old password stops working, the user must change it.
    page.once("dialog", (d) => void d.accept());
    await page.getByTestId("admin-reset").click();
    const temp = (await page.getByTestId("admin-temp-value").innerText()).trim();
    expect(temp).toMatch(/^[A-Za-z2-9]{14}$/);

    const device = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.202.0.3" } });
    const u = await device.newPage();
    await login(u, user.email, user.password);
    await expect(u.getByTestId("auth-error")).toBeVisible();
    await login(u, user.email, temp);
    await expect(u).toHaveURL(/\/start/);
    await u.goto("/account");
    await expect(u.getByTestId("must-change")).toBeVisible();
    const kitId = (await u.evaluate(() => fetch("/api/generations").then((r) => r.json()))).items[0].id;
    const re = await u.request.put(`/api/generations/${kitId}/publish`, { data: { enabled: true } });
    expect(re.status()).toBe(409);
    expect((await re.json()).error).toBe("taken_down");
    // Deleting the page and publishing again does not undo the takedown.
    expect((await u.request.delete(`/api/generations/${kitId}/publish`)).status()).toBe(200);
    const again = await u.request.put(`/api/generations/${kitId}/publish`, { data: { enabled: true } });
    expect(again.status()).toBe(409);
    expect((await again.json()).error).toBe("taken_down");
    const settings = await u.request.put(`/api/generations/${kitId}/publish`, { data: { template: "modern" } });
    expect(settings.status()).toBe(200);
    const fresh = (await settings.json()).publicResume;
    expect(fresh.enabled).toBe(false);
    expect((await (await u.context().request.get(`/cv/${fresh.slug}`)).status())).toBe(404);

    // Disable: the session ends and sign-in is refused.
    page.once("dialog", (d) => void d.accept());
    await page.getByTestId("admin-disable").click();
    await expect(page.getByTestId("admin-enable")).toBeVisible();
    expect((await u.evaluate(() => fetch("/api/auth/me").then((r) => r.json()))).user).toBeNull();
    await login(u, user.email, temp);
    await expect(u.getByTestId("auth-error")).toBeVisible();
    await page.getByTestId("admin-enable").click();
    await expect(page.getByTestId("admin-disable")).toBeVisible();
    await login(u, user.email, temp);
    await expect(u).toHaveURL(/\/start/);
    await device.close();
  });
});
