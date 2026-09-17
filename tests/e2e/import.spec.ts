import { test, expect } from "./fixtures";
import path from "node:path";
import { skipTour } from "./helpers";

const fixture = (n: string) => path.join(process.cwd(), "tests", "fixtures", n);

test.describe("import PDF / DOCX", () => {
  test("the ATS check reads a PDF and a DOCX in the browser, counts the words, and refuses a scan", async ({ page }) => {
    const uploads: string[] = [];
    page.on("request", (r) => { if (r.url().includes("/api/") && r.method() !== "GET") uploads.push(new URL(r.url()).pathname); });
    await page.goto("/ats-check");
    await skipTour(page);
    await page.goto("/ats-check");

    await page.getByTestId("import-file").setInputFiles(fixture("sample-resume.pdf"));
    await expect(page.getByTestId("import-status")).toHaveAttribute("data-state", "done", { timeout: 20_000 });
    await expect(page.getByTestId("import-status")).toContainText(/\d+ words imported|palavras importadas|palabras importadas/);
    const pdfText = await page.getByTestId("ats-resume").inputValue();
    expect(pdfText).toContain("Alex Ribeiro");
    expect(pdfText).toContain("- Grew qualified pipeline 38%");
    expect(pdfText).toContain("São Paulo");

    // The imported text scores like a paste would.
    await page.getByTestId("ats-check").click();
    await expect(page.getByTestId("ats-result")).toBeVisible();
    expect(Number(await page.getByTestId("ats-score").innerText())).toBeGreaterThan(40);

    await page.getByTestId("import-file").setInputFiles(fixture("sample-resume.docx"));
    await expect(page.getByTestId("import-status")).toHaveAttribute("data-state", "done", { timeout: 20_000 });
    const docxText = await page.getByTestId("ats-resume").inputValue();
    expect(docxText).toContain("# Maria Souza");
    expect(docxText).toContain("## Experiência profissional");
    expect(docxText).toContain("- Automatizei 15 relatórios em Power BI");

    await page.getByTestId("import-file").setInputFiles(fixture("scanned.pdf"));
    await expect(page.getByTestId("import-status")).toHaveAttribute("data-state", "error", { timeout: 20_000 });
    await expect(page.getByTestId("import-status")).toContainText(/scanned|escaneado/i);
    expect(await page.getByTestId("ats-resume").inputValue()).toContain("Maria Souza");   // a failed import never wipes the text

    // The file was parsed locally: nothing was posted anywhere.
    expect(uploads.filter((p) => p !== "/api/tour")).toEqual([]);
  });

  test("the résumé step of /start accepts a dropped file and the build step places a draft under Experience", async ({ page }) => {
    await page.goto("/");
    await skipTour(page);
    await page.goto("/start");
    await page.getByTestId("via-text").click();
    await page.getByTestId("mode-improve").click();
    await page.getByTestId("role").fill("Growth Lead");
    await page.getByTestId("next").click();
    await expect(page.getByTestId("resume")).toBeVisible();
    await page.getByTestId("import-file").setInputFiles(fixture("sample-resume.pdf"));
    await expect(page.getByTestId("import-status")).toHaveAttribute("data-state", "done", { timeout: 20_000 });
    await expect(page.getByTestId("resume")).toHaveValue(/Alex Ribeiro/);
    await page.getByTestId("next").click();
    await expect(page.getByTestId("result")).toBeVisible({ timeout: 30_000 });

    await page.goto("/start");
    await page.getByTestId("via-text").click();
    await page.getByTestId("mode-build").click();
    await page.getByTestId("role").fill("Data Analyst");
    await page.getByTestId("next").click();
    await page.getByTestId("build-exp").fill("Volunteer treasurer, 2024");
    await page.getByTestId("import-file").setInputFiles(fixture("sample-resume.docx"));
    await expect(page.getByTestId("import-status")).toHaveAttribute("data-state", "done", { timeout: 20_000 });
    await expect(page.getByTestId("build-exp")).toHaveValue(/Volunteer treasurer, 2024\n\n# Maria Souza/);
  });
});
