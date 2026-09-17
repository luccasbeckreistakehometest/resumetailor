import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildDocx, fileBase, toPlainText } from "@/lib/resume/export";
import { formFields } from "@/lib/resume/formFields";
import { mockKit } from "@/lib/ai/kit";

const kit = mockKit({ mode: "tailor", targetRole: "Growth Lead", lang: "en" });

describe("exports", () => {
  it("builds a Word file whose document.xml has the name and a bullet", async () => {
    const buf = await buildDocx(kit.resume, "resume", "Resume-Alex-Ribeiro");
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    expect(xml).toContain("Alex Ribeiro");
    expect(xml).toContain("Grew qualified pipeline 38% YoY through lifecycle campaigns");
    expect(xml).toContain("w:numPr");                       // a real list, not a typed dash
    expect(xml).not.toContain("**");
  });

  it("names files after the candidate and the role, per language", () => {
    expect(fileBase("resume", "pt", "Alex Ribeiro", "Gerente de Marketing")).toBe("Curriculo-Alex-Ribeiro-Gerente-de-Marketing");
    expect(fileBase("cover", "en", "José Ñúñez", "")).toBe("Cover-letter-Jose-Nunez");
    expect(fileBase("resume", "es", "", "")).toBe("CV");
  });

  it("turns Markdown into pasteable text", () => {
    const txt = toPlainText(kit.resume);
    expect(txt).toContain("EXPERIENCE");
    expect(txt).toContain("• Led a team of 4 across paid, CRM and content");
    expect(txt).not.toMatch(/\*\*|^#/m);
  });

  it("splits the kit into form fields", () => {
    const f = formFields(kit.resume, kit.coverLetter);
    expect(f.experiences).toHaveLength(1);
    expect(f.experiences[0]).toMatchObject({ title: "Growth Lead", company: "Acme", start: "2021", end: "2026" });
    expect(f.experiences[0].description).toBe("• Grew qualified pipeline 38% YoY through lifecycle campaigns\n• Led a team of 4 across paid, CRM and content");
    expect(f.skills).toBe("HubSpot, SQL, A/B testing, Copywriting");
    expect(f.summary).toContain("6 years");
  });
});
