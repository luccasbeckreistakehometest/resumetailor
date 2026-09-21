import { type Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { buildKitByText, signUp } from "./helpers";

/**
 * Screen-to-paper parity (docs/DESIGN.md §14, surface 3).
 *
 * The candidate edits the résumé in one place, prints it from another and publishes it to a third.
 * Those three pages used to be free to drift — /print set its own container, the public page set
 * another, and only the shared `.doc-*` class held them together. This spec pins the thing that
 * actually matters: the computed type of the document is identical in all three, and the sheet
 * around it is the same object.
 *
 * It fails loudly if anyone gives one of the three its own font, size or leading.
 */

type Type = { family: string; size: string; leading: string; colour: string; h2Size: string; h2Family: string; h2Case: string };

async function documentType(page: Page, selector: string): Promise<Type> {
  return page.locator(selector).evaluate((root) => {
    const doc = root.querySelector('[class^="doc-"], [class*=" doc-"]') ?? root;
    // NOT the first <p>: the line right under the name is the contact line, and the stylesheet
    // deliberately sets that one in the interface face. Measure a paragraph of the document's body.
    const body = doc.querySelector("h2 ~ p") ?? doc.querySelectorAll("p")[1] ?? doc;
    const h2 = doc.querySelector("h2") ?? doc;
    const b = getComputedStyle(body as Element);
    const h = getComputedStyle(h2 as Element);
    return {
      family: b.fontFamily, size: b.fontSize, leading: b.lineHeight, colour: b.color,
      h2Size: h.fontSize, h2Family: h.fontFamily, h2Case: h.textTransform,
    };
  });
}

test.describe("the document reads the same everywhere", () => {
  test.describe.configure({ timeout: 120_000 });

  test("editor preview, /print and the public web résumé are set identically", async ({ page, browser }) => {
    await buildKitByText(page);
    await page.getByTestId("unlock").click();
    await signUp(page);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 20_000 });

    await page.getByTestId("publish-toggle").check();
    await expect(page.getByTestId("publish-url")).toHaveValue(/\/cv\/[a-z0-9-]+$/);
    const publicUrl = await page.getByTestId("publish-url").inputValue();
    const id = page.url().includes("gen=") ? new URL(page.url()).searchParams.get("gen")! : await page.evaluate(() => localStorage.getItem("rt_last_gen")!);

    await page.goto(`/edit/${id}`);
    await expect(page.getByTestId("edit-preview")).toBeVisible({ timeout: 20_000 });
    const inEditor = await documentType(page, '[data-testid="edit-preview"]');

    await page.goto(`/print?id=${id}`);
    await expect(page.getByTestId("document")).toBeVisible();
    const inPrint = await documentType(page, '[data-testid="document"]');

    const ctx = await browser.newContext();
    const visitor = await ctx.newPage();
    await visitor.goto(publicUrl);
    const inPublic = await documentType(visitor, '[data-testid="cv-document"]');
    await ctx.close();

    // The body face is the document face, not the interface one, in all three.
    expect(inEditor.family.toLowerCase()).toContain("source serif 4");
    expect(inPrint).toEqual(inEditor);
    expect(inPublic).toEqual(inEditor);

    // The section heading is the interface face, uppercase — the one place the two faces meet.
    expect(inPrint.h2Family.toLowerCase()).toContain("public sans");
    expect(inPrint.h2Case).toBe("uppercase");

    // And the sheet itself is the same object on the page that prints and the page that publishes.
    const sheetOf = (p: Page, sel: string) => p.locator(sel).evaluate((el) => {
      const sheet = el.closest(".sheet") ?? el;
      const s = getComputedStyle(sheet);
      return { width: sheet.clientWidth, radius: s.borderRadius, background: s.backgroundColor };
    });
    await page.goto(`/print?id=${id}`);
    const printSheet = await sheetOf(page, '[data-testid="document"]');
    const ctx2 = await browser.newContext();
    const visitor2 = await ctx2.newPage();
    await visitor2.goto(publicUrl);
    const publicSheet = await sheetOf(visitor2, '[data-testid="cv-document"]');
    await ctx2.close();
    expect(printSheet.radius).toBe("0px"); // paper has square corners
    expect(publicSheet).toEqual(printSheet);
  });
});
