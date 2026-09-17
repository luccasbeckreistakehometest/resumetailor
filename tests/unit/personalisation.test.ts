import { describe, expect, it } from "vitest";
import { GENERIC_BELOW, personalisation } from "@/lib/ats/personalisation";
import { mockKit } from "@/lib/ai/kit";

const POSTING = `Growth Marketing Manager. Own lifecycle marketing and paid acquisition. Requirements: HubSpot, SQL, A/B testing, attribution modelling, team leadership, Salesforce, Marketo, webinar programmes, SEO, Google Ads, account-based marketing.`;

describe("personalisation meter", () => {
  it("needs a posting", () => {
    expect(personalisation("# Alex\n- did things", "")).toBeNull();
    expect(personalisation("", POSTING)).toBeNull();
  });

  it("calls a template-like résumé generic and a mirrored one personalised", () => {
    const generic = personalisation(`# Alex\n## Experience\n- Responsible for promotional activities\n- Worked with the team on campaigns\n- Helped with reports`, POSTING)!;
    expect(generic.generic).toBe(true);
    expect(generic.score).toBeLessThan(GENERIC_BELOW);
    expect(generic.specific).toBe(0);
    const tailored = personalisation(`# Alex\n## Experience\n- Ran lifecycle marketing in HubSpot and Marketo, growing pipeline 38%\n- Owned paid acquisition on Google Ads with a $2M budget; SEO up 40%\n- Built attribution modelling in SQL; ran 40 A/B tests\n- Led webinar programmes and account-based marketing for 12 accounts; Salesforce admin`, POSTING)!;
    expect(tailored.generic).toBe(false);
    expect(tailored.score).toBeGreaterThan(generic.score);
    expect(tailored.coverage).toBeGreaterThanOrEqual(60);
    expect(tailored.missing.length).toBeLessThan(tailored.matched.length);
  });

  it("does not count a year as a specific claim", () => {
    const p = personalisation(`- Joined in 2021\n- Grew revenue 30%`, POSTING)!;
    expect(p.bullets).toBe(2);
    expect(p.specific).toBe(1);
  });

  it("the deepened fixture raises the meter by addressing the must-haves", () => {
    const base = { mode: "tailor" as const, targetRole: "Growth Marketing Manager", lang: "en" as const, jobDescription: POSTING, resume: "x" };
    const before = personalisation(mockKit(base).resume, POSTING)!;
    const after = personalisation(mockKit({ ...base, deepen: { mustHaves: before.missing } }).resume, POSTING)!;
    expect(after.score).toBeGreaterThan(before.score);
    expect(after.coverage).toBeGreaterThan(before.coverage);
  });
});
