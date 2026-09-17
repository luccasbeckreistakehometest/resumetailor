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
  await expect(page.getByTestId("admin-totals")).toContainText("1"); // one user
  await page.getByRole("button", { name: /^users|usuários|usuarios/i }).click();
  await expect(page.getByTestId("admin-table")).toContainText(user.email);
  await page.getByRole("button", { name: /first sessions|primeiras/i }).click();
  await expect(page.getByTestId("admin-table")).toContainText(/generate/);
});
