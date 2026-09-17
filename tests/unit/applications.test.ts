import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { funnel, milestonesFor, nextSteps, normaliseLink, type ApplicationLike } from "@/lib/applications/logic";

const DIR = path.join(process.cwd(), "data", "unit-applications");
process.env.DATA_DIR = DIR;
fs.rmSync(DIR, { recursive: true, force: true });

const { createUser, claimAnonymous } = await import("@/lib/server/users");
const { createApplication, updateApplication, listApplications, ownsApplication, getApplication, deleteApplication } = await import("@/lib/server/applications");

const none = { appliedAt: null, interviewAt: null, offerAt: null, rejectedAt: null };
const app = (stage: ApplicationLike["stage"], m: Partial<ApplicationLike> = {}): ApplicationLike => ({ stage, nextStepAt: null, ...none, ...m });

describe("milestones", () => {
  it("stamps everything a stage implies, once", async () => {
    expect(milestonesFor("applied", none, "2026-09-01")).toEqual({ ...none, appliedAt: "2026-09-01" });
    expect(milestonesFor("offer", none, "2026-09-01")).toEqual({ appliedAt: "2026-09-01", interviewAt: "2026-09-01", offerAt: "2026-09-01", rejectedAt: null });
    expect(milestonesFor("rejected", none, "2026-09-01")).toEqual({ ...none, appliedAt: "2026-09-01", rejectedAt: "2026-09-01" });
    expect(milestonesFor("saved", none, "2026-09-01")).toEqual(none);
    // a whole row may be passed in; only the milestone keys come back
    expect(Object.keys(milestonesFor("applied", { ...none, stage: "saved", notes: "x" } as never, "2026-09-01")).sort()).toEqual(["appliedAt", "interviewAt", "offerAt", "rejectedAt"]);
  });
  it("keeps the first date when a card moves back and forth", async () => {
    const first = milestonesFor("interview", none, "2026-09-01");
    expect(milestonesFor("interview", first, "2026-09-20").interviewAt).toBe("2026-09-01");
    expect(milestonesFor("rejected", first, "2026-09-20")).toEqual({ ...first, rejectedAt: "2026-09-20" });
  });
});

describe("funnel", () => {
  it("counts by milestone, not by column, so a rejection after an interview still counts the interview", async () => {
    const items = [
      app("saved"),
      app("applied", { appliedAt: "2026-09-01" }),
      app("interview", { appliedAt: "2026-09-01", interviewAt: "2026-09-05" }),
      app("rejected", { appliedAt: "2026-09-01", interviewAt: "2026-09-05", rejectedAt: "2026-09-10" }),
      app("offer", { appliedAt: "2026-09-01", interviewAt: "2026-09-05", offerAt: "2026-09-12" }),
    ];
    const f = funnel(items, "2026-09-15");
    expect(f).toMatchObject({ total: 5, saved: 1, applied: 4, interviews: 3, offers: 1, rejected: 1, interviewRate: 75, offerRate: 33 });
  });
  it("has no rate before anything was applied to, and tracks next steps", async () => {
    expect(funnel([app("saved")], "2026-09-15").interviewRate).toBeNull();
    const items = [
      app("applied", { appliedAt: "2026-09-01", nextStepAt: "2026-09-10" }),   // overdue
      app("interview", { appliedAt: "2026-09-01", interviewAt: "2026-09-05", nextStepAt: "2026-09-18" }),   // this week
      app("saved", { nextStepAt: "2026-10-30" }),   // later
      app("rejected", { appliedAt: "2026-09-01", rejectedAt: "2026-09-02", nextStepAt: "2026-09-16" }),   // closed: ignored
    ];
    const f = funnel(items, "2026-09-15");
    expect(f.overdue).toBe(1);
    expect(f.upcoming).toBe(1);
    const steps = nextSteps(items, "2026-09-15");
    expect(steps.map((s) => s.item.nextStepAt)).toEqual(["2026-09-10", "2026-09-18", "2026-10-30"]);
    expect(steps[0].overdue).toBe(true);
    expect(steps[1].overdue).toBe(false);
  });
  it("normalises pasted links", async () => {
    expect(normaliseLink(" gupy.io/jobs/1 ")).toBe("https://gupy.io/jobs/1");
    expect(normaliseLink("http://x.y")).toBe("http://x.y");
    expect(normaliseLink("")).toBe("");
  });
});

describe("persistence", () => {
  let n = 0;
  const user = () => createUser({ email: `a${++n}@example.com`, password: "password123" });

  it("moves through stages with milestones and never clears them", async () => {
    const u = await user();
    const a = createApplication({ userId: u.id, anonId: null }, { company: "Acme", role: "Growth Lead", link: "acme.com/jobs/1" });
    expect(a.stage).toBe("saved");
    expect(a.link).toBe("https://acme.com/jobs/1");
    expect(updateApplication(a.id, { stage: "interview" })).toMatchObject({ stage: "interview", appliedAt: expect.any(String), interviewAt: expect.any(String) });
    const back = updateApplication(a.id, { stage: "saved", notes: "call back Monday", nextStepAt: "2026-09-22" });
    expect(back.stage).toBe("saved");
    expect(back.interviewAt).toBeTruthy();
    expect(back.notes).toBe("call back Monday");
    expect(back.nextStepAt).toBe("2026-09-22");
  });

  it("is scoped to its owner and claimed on signup", async () => {
    const anon = "anon_apps";
    const a = createApplication({ userId: null, anonId: anon }, { company: "Globex" });
    expect(ownsApplication(a, null, anon)).toBe(true);
    const other = await user();
    expect(ownsApplication(a, other.id, undefined)).toBe(false);
    expect(listApplications(other.id, undefined)).toHaveLength(0);
    const u = await user();
    claimAnonymous(u.id, anon);
    expect(listApplications(u.id, undefined).map((r) => r.id)).toEqual([a.id]);
    expect(listApplications(null, anon)).toHaveLength(0);
    deleteApplication(a.id);
    expect(getApplication(a.id)).toBeNull();
  });
});
