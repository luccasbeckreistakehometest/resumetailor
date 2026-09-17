import { describe, expect, it } from "vitest";
import { linkedinCoverage, profileAsText, profileText, roleVocabulary, type LinkedInProfile } from "@/lib/linkedin/logic";
import { mockLinkedIn } from "@/lib/ai/linkedin";
import { mockKit } from "@/lib/ai/kit";

const POSTING = `Growth Marketing Manager. Requirements: HubSpot, HubSpot workflows, SQL, SQL dashboards, Salesforce, Salesforce admin, A/B testing, team leadership, Marketo, webinar programmes.`;
const kit = mockKit({ mode: "tailor", targetRole: "Growth Marketing Manager", lang: "en", resume: "x", jobDescription: POSTING });
const profile: LinkedInProfile = {
  headlines: ["Growth Marketing Manager · HubSpot · SQL"], about: "I run lifecycle programmes in HubSpot and report in SQL.",
  experience: [{ title: "Growth Lead", company: "Acme", period: "2021 – 2026", bullets: ["Led a team of 4", "Ran 40 A/B tests"] }], skills: ["HubSpot", "SQL", "A/B testing"], notes: "",
};

describe("role vocabulary", () => {
  it("comes from the posting when there is one, else from the kit's keyword list", () => {
    expect(roleVocabulary(POSTING, kit.keywords)).toContain("hubspot");
    expect(roleVocabulary(POSTING, kit.keywords)).toContain("salesforce");
    const fromKit = roleVocabulary("", kit.keywords);
    expect(fromKit).toEqual(kit.keywords.map((k) => k.term.toLowerCase()));
    expect(roleVocabulary("short", kit.keywords)).toEqual(fromKit);
  });
});

describe("coverage", () => {
  it("counts the role's terms found anywhere in the profile, and lists the missing ones", () => {
    const c = linkedinCoverage(profile, ["hubspot", "sql", "salesforce", "team leadership", "a/b testing"]);
    expect(c.matched).toEqual(expect.arrayContaining(["hubspot", "sql", "a/b testing"]));
    expect(c.missing).toContain("salesforce");
    expect(c.coverage).toBeGreaterThanOrEqual(60);
    expect(c.coverage).toBeLessThan(100);
    expect(linkedinCoverage(profile, []).coverage).toBe(0);
  });
  it("flattens every section into the searchable text", () => {
    const t = profileText(profile);
    expect(t).toContain("Growth Lead"); expect(t).toContain("Ran 40 A/B tests"); expect(t).toContain("A/B testing");
  });
});

describe("fixture and paste text", () => {
  it("gives three headlines in the kit's language, skills the résumé supports, and a coverage above zero", () => {
    const args = { kit, targetRole: "Growth Marketing Manager", posting: POSTING, vocabulary: roleVocabulary(POSTING, kit.keywords) };
    const p = mockLinkedIn({ ...args, lang: "pt" });
    expect(p.headlines).toHaveLength(3);
    expect(p.headlines.every((h) => h.length <= 220)).toBe(true);
    expect(p.about).toMatch(/cadeira de Growth Marketing Manager/);
    expect(p.skills.length).toBeGreaterThan(0);
    expect(p.skills.length).toBeLessThanOrEqual(10);
    expect(linkedinCoverage(p, args.vocabulary).coverage).toBeGreaterThan(0);
    expect(mockLinkedIn({ ...args, lang: "es" }).about).toMatch(/puesto de/);
  });
  it("renders the whole profile as one pasteable text", () => {
    const text = profileAsText(profile, { headline: "Headline", about: "About", experience: "Experience", skills: "Skills" });
    expect(text).toContain("Headline\n1. Growth Marketing Manager");
    expect(text).toContain("Growth Lead — Acme (2021 – 2026)\n- Led a team of 4");
    expect(text).toContain("Skills\nHubSpot · SQL · A/B testing");
  });
});
