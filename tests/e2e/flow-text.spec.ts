import { test, expect } from "@playwright/test";
import { buildKitByText, signUp } from "./helpers";

test("type flow: preview → account → first kit unlocked with the free credit → print → library", async ({ page }) => {
  await buildKitByText(page);
  await expect(page.getByTestId("locked")).toBeVisible();
  await expect(page.getByTestId("kit")).toBeHidden();

  // Anonymous unlock asks for an account; signing up claims the kit and grants one credit.
  await page.getByTestId("unlock").click();
  await expect(page.getByTestId("auth-modal")).toBeVisible();
  await signUp(page);
  await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("credits")).toContainText("0");

  // The document renders in the print view for the owner.
  const [print] = await Promise.all([page.waitForEvent("popup"), page.getByRole("link", { name: /save as pdf|print/i }).click()]);
  await expect(print.getByTestId("document")).toContainText("Alex Ribeiro");

  // …and is listed in the library as unlocked.
  await page.goto("/library");
  await expect(page.getByTestId("library-item")).toHaveCount(1);
  await expect(page.getByTestId("library-item")).toContainText(/unlocked/i);
});

test("second kit without credits points to pricing", async ({ page }) => {
  await buildKitByText(page);
  await page.getByTestId("unlock").click();
  await signUp(page);
  await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });
  await buildKitByText(page);
  await page.getByTestId("unlock").click();
  await expect(page.getByRole("link", { name: /get credits|comprar/i })).toBeVisible();
});
