import { test, expect } from "@playwright/test";
import { skipTour } from "./helpers";

test("pricing shows the packs and asks for an account before checkout", async ({ page }) => {
  await page.goto("/pricing");
  await skipTour(page);
  await page.goto("/pricing");
  for (const k of ["1", "5", "15"]) await expect(page.getByTestId(`pack-${k}`)).toBeVisible();
  await expect(page.getByTestId("pack-1")).toContainText("$9");
  await page.getByRole("button", { name: "PT" }).click();
  await expect(page.getByTestId("pack-1")).toContainText("R$ 39");
  // buttons are disabled until a provider is configured on the server; that is shown, not hidden
  const buy = page.getByTestId("buy-1");
  if (await buy.isEnabled()) { await buy.click(); await expect(page.getByTestId("auth-modal")).toBeVisible(); }
  else await expect(page.getByText(/not configured|não está configurado|no está configurado/i)).toBeVisible();
});
