import { test, expect } from "./fixtures";
import { buildKitByText, login, signUp } from "./helpers";

test("admin sees totals, users, and the first-session timeline; users do not", async ({ page }) => {
  // a real user leaves a trail first
  await buildKitByText(page);
  await page.getByTestId("unlock").click();
  const user = await signUp(page);
  await page.goto("/admin");
  await expect(page.getByText(/admins only|só admin|solo admins/i)).toBeVisible();
  await page.getByTestId("signout").click();

  await login(page, "admin@resumetailor.app", "resumetailor2026");
  await page.goto("/admin");
  await expect(page.getByTestId("admin-totals")).toBeVisible();
  await expect(page.getByTestId("admin-totals")).toContainText(/Users\s*[1-9]/); // at least this user
  await page.getByRole("button", { name: /^users|usuários|usuarios/i }).click();
  await expect(page.getByTestId("admin-table")).toContainText(user.email);
  await page.getByRole("button", { name: /first sessions|primeiras/i }).click();
  await expect(page.getByTestId("admin-table")).toContainText(/generate/);
});

test("state-changing API calls from another site are refused, even with the admin's cookie", async ({ page }) => {
  await login(page, "admin@resumetailor.app", "resumetailor2026");
  const me = (await (await page.request.get("/api/auth/me")).json()).user;
  expect(me.role).toBe("admin");
  // A page on a sibling app (same site, other origin) posting a text/plain JSON body.
  const forged = await page.request.post("/api/admin/credits", {
    headers: { Origin: "https://betmatic.marqa.online", "Content-Type": "text/plain" },
    data: JSON.stringify({ userId: me.id, delta: 500 }),
  });
  expect(forged.status()).toBe(403);
  expect(await forged.json()).toEqual({ error: "forbidden", reason: "cross_site" });
  const noOrigin = await page.request.post("/api/account/logout-all", { headers: { "Sec-Fetch-Site": "cross-site" } });
  expect(noOrigin.status()).toBe(403);
  expect((await (await page.request.get("/api/auth/me")).json()).user.credits).toBe(me.credits);
  // The app's own pages keep working, and payment webhooks are not blocked by the check.
  const own = await page.evaluate(async (id) => (await fetch("/api/admin/credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id, delta: 1 }) })).status, me.id);
  expect(own).toBe(200);
  const hook = await page.request.post("/api/webhooks/mercadopago", { headers: { Origin: "https://api.mercadopago.com" }, data: { type: "payment", data: { id: "does-not-exist" } } });
  expect(hook.status()).toBe(200);
});
