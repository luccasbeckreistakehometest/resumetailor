import { test, expect } from "@playwright/test";
import { buildKitByText, signUp, skipTour } from "./helpers";

test.describe("application tracker", () => {
  test("add → move across the board → funnel → edit → persists → survives signup → delete", async ({ page }) => {
    await page.goto("/applications");
    await skipTour(page);
    await page.goto("/applications");
    await expect(page.getByTestId("board")).toBeVisible();
    await page.getByTestId("app-open-add").click();
    await page.getByTestId("app-add").click();
    await expect(page.getByTestId("app-error")).toBeVisible();
    await page.getByTestId("app-company").fill("Acme");
    await page.getByTestId("app-role").fill("Growth Lead");
    await page.getByTestId("app-link").fill("acme.com/jobs/42");
    await page.getByTestId("app-add").click();
    await expect(page.getByTestId("col-saved").getByTestId("app-card")).toHaveCount(1);
    await expect(page.getByTestId("funnel-total")).toContainText("1");
    await expect(page.getByTestId("funnel-rate")).toContainText("—");

    // Saved → Applied → Interview: the funnel follows the milestones.
    await page.getByTestId("move-next").click();
    await expect(page.getByTestId("col-applied").getByTestId("app-card")).toHaveCount(1);
    await expect(page.getByTestId("funnel-applied")).toContainText("1");
    await page.getByTestId("move-next").click();
    await expect(page.getByTestId("col-interview").getByTestId("app-card")).toHaveCount(1);
    await expect(page.getByTestId("funnel-interviews")).toContainText("1");
    await expect(page.getByTestId("funnel-rate")).toContainText("100%");
    // and back to rejected via the select keeps the interview counted
    await page.getByTestId("card-stage").selectOption("rejected");
    await expect(page.getByTestId("col-rejected").getByTestId("app-card")).toHaveCount(1);
    await expect(page.getByTestId("funnel-interviews")).toContainText("1");

    // Notes and a next-step date
    await page.getByTestId("app-edit-btn").click();
    await page.getByTestId("edit-notes").fill("Recruiter: Ana. Follow up on Monday.");
    await page.getByTestId("edit-next").fill("2030-01-15");
    await page.getByTestId("edit-save").click();
    await expect(page.getByTestId("app-notes")).toContainText("Ana");
    await expect(page.getByTestId("app-next")).toBeVisible();
    await expect(page.getByRole("link", { name: /open posting|abrir vaga|abrir oferta/i })).toHaveAttribute("href", "https://acme.com/jobs/42");

    // Server-stored: a reload shows the same board; signing up claims it.
    await page.reload();
    await expect(page.getByTestId("col-rejected").getByTestId("app-card")).toHaveCount(1);
    await page.getByTestId("open-auth").click();
    await signUp(page);
    await page.goto("/applications");
    await expect(page.getByTestId("app-card")).toHaveCount(1);
    await expect(page.getByTestId("app-notes")).toContainText("Ana");

    await page.getByTestId("app-edit-btn").click();
    await page.getByTestId("app-delete").click();
    await expect(page.getByTestId("app-card")).toHaveCount(0);
  });

  test("a kit result offers to track the application with the kit and role prefilled", async ({ page }) => {
    await buildKitByText(page);
    await page.getByTestId("track").first().click();
    await expect(page).toHaveURL(/\/applications\?add=1/);
    await expect(page.getByTestId("app-add-form")).toBeVisible();
    await expect(page.getByTestId("app-role")).toHaveValue("Marketing Analyst");
    await expect(page.getByTestId("app-kit")).not.toHaveValue("");
    await page.getByTestId("app-company").fill("Globex");
    await page.getByTestId("app-stage").selectOption("applied");
    await page.getByTestId("app-add").click();
    await expect(page.getByTestId("col-applied").getByTestId("app-card")).toHaveCount(1);
    await expect(page.getByTestId("app-kit-chip")).toContainText("Alex Ribeiro");
    await expect(page.getByTestId("funnel-applied")).toContainText("1");
  });
});
