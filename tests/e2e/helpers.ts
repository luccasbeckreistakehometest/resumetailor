import { expect, type Page } from "@playwright/test";

export const BUILD_PROFILE = {
  edu: "BA in Marketing, Universidade de São Paulo, 2025. Coursework in analytics and consumer behaviour.",
  skills: "Excel, Google Analytics, HubSpot, fluent English, SQL basics",
};

/**
 * Marks the tour done for this browser context before anything renders, so specs that are not
 * about the tour never race its welcome card. Falls back to dismissing it if already on screen.
 */
export async function skipTour(page: Page) {
  await page.request.post("/api/tour", { data: { step: 0, completed: true, event: "e2e_skip" } });
  const later = page.getByTestId("tour-later");
  if (await later.isVisible({ timeout: 500 }).catch(() => false)) await later.click();
}

export async function signUp(page: Page, email = `u${Date.now()}@example.com`, password = "password123") {
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(password);
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("auth-modal")).toBeHidden();
  return { email, password };
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByText(/Already have an account|Já tem conta|Ya tienes cuenta/).click();
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(password);
  await page.getByTestId("auth-submit").click();
}

/** Text flow through the "build my first resume" path up to the (mocked) result. */
export async function buildKitByText(page: Page) {
  await page.goto("/");
  await skipTour(page);
  await page.goto("/start");
  await page.getByTestId("via-text").click();
  await page.getByTestId("mode-build").click();
  await page.getByTestId("role").fill("Marketing Analyst");
  await page.getByTestId("next").click();
  await page.getByTestId("build-edu").fill(BUILD_PROFILE.edu);
  await page.getByTestId("build-skills").fill(BUILD_PROFILE.skills);
  await page.getByTestId("next").click();
  await expect(page.getByTestId("result")).toBeVisible({ timeout: 30_000 });
}
