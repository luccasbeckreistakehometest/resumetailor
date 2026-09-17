import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { decideAccess, isTemplate, slugify, stripContact } from "@/lib/resume/public";

const DIR = path.join(process.cwd(), "data", "unit-public");
process.env.DATA_DIR = DIR;
fs.rmSync(DIR, { recursive: true, force: true });

const { createUser } = await import("@/lib/server/users");
const { saveGeneration, unlockGeneration, deleteGeneration, serialise, getGeneration } = await import("@/lib/server/generations");
const { mockKit } = await import("@/lib/ai/kit");
const { upsertPublic, getPublicBySlug, getPublicByGeneration, verifyPin, pinToken, pinTokenValid, bumpViews, listPublic, deletePublic } = await import("@/lib/server/publicResumes");

describe("access rules", () => {
  it("only an enabled page opens; a PIN page opens only once verified; missing and off look alike", async () => {
    expect(decideAccess(null, false)).toBe("missing");
    expect(decideAccess({ enabled: false, hasPin: false }, true)).toBe("off");
    expect(decideAccess({ enabled: true, hasPin: false }, false)).toBe("ok");
    expect(decideAccess({ enabled: true, hasPin: true }, false)).toBe("pin");
    expect(decideAccess({ enabled: true, hasPin: true }, true)).toBe("ok");
    expect(decideAccess({ enabled: true, hasPin: true }, false, true)).toBe("ok");
    expect(decideAccess({ enabled: false, hasPin: false }, false, true)).toBe("off");
  });
});

describe("slug and contact stripping", () => {
  it("slugifies accented names and falls back when nothing is left", async () => {
    expect(slugify("Maria de Souza Júnior")).toBe("maria-de-souza-junior");
    expect(slugify("  ##  ")).toBe("cv");
    expect(slugify("A".repeat(80)).length).toBeLessThanOrEqual(40);
  });
  it("removes emails, phones and profile links but keeps everything else", async () => {
    const md = "# Alex Ribeiro\nGrowth Lead · alex@example.com · +55 11 99999-0000 · linkedin.com/in/alexribeiro · São Paulo\n\n## Experience\n- Grew pipeline 38% in 2021 (team of 4)\nSee https://acme.com/case for details";
    const out = stripContact(md);
    expect(out).not.toMatch(/alex@example.com|99999|linkedin\.com|acme\.com/);
    expect(out).toContain("# Alex Ribeiro");
    expect(out).toContain("Growth Lead · São Paulo");
    expect(out).toContain("- Grew pipeline 38% in 2021 (team of 4)");
    expect(out).toContain("See for details");
  });
  it("drops a line that was only contact details", async () => {
    expect(stripContact("# Maria\nmaria@example.com | (11) 98888-7777\nCuritiba")).toBe("# Maria\nCuritiba");
  });
  it("knows the templates", async () => {
    expect(isTemplate("modern")).toBe(true);
    expect(isTemplate("neon")).toBe(false);
  });
});

describe("publishing", () => {
  let n = 0;
  const user = () => createUser({ email: `pub${++n}@example.com`, password: "password123" });
  const kit = mockKit({ mode: "improve", targetRole: "Growth Lead", lang: "pt", resume: "x" });
  const gen = (userId: string) => saveGeneration({ userId, anonId: null, mode: "improve", source: "text", lang: "pt", targetRole: "Growth Lead", input: {}, kit, model: "mock", costUsd: 0 });

  it("creates the page off by default with a stable slug, then applies patches", async () => {
    const u = await user(); const g = gen(u.id); unlockGeneration(g.id, u.id);
    const first = await upsertPublic(g.id, u.id, g.title, {});
    expect(first.enabled).toBe(0);
    expect(first.slug).toMatch(/^alex-ribeiro-[0-9a-f]{6}$/);
    const on = await upsertPublic(g.id, u.id, g.title, { enabled: true, template: "elegant", hideContact: true, indexable: true });
    expect(on.slug).toBe(first.slug);
    expect(on).toMatchObject({ enabled: 1, template: "elegant", hideContact: 1, indexable: 1 });
    expect(getPublicBySlug(first.slug)!.id).toBe(first.id);
    expect(listPublic(u.id)).toHaveLength(1);
    expect(serialise(getGeneration(g.id)!).publicResume).toMatchObject({ slug: first.slug, enabled: true, hasPin: false, views: 0 });
  });

  it("hashes the PIN, verifies it, and a new PIN invalidates the old browser token", async () => {
    const u = await user(); const g = gen(u.id); unlockGeneration(g.id, u.id);
    const row = await upsertPublic(g.id, u.id, g.title, { enabled: true, pin: "2468" });
    expect(row.pinHash).not.toContain("2468");
    expect(await verifyPin(row, "2468")).toBe(true);
    expect(await verifyPin(row, "0000")).toBe(false);
    const token = pinToken(row);
    expect(pinTokenValid(row, token)).toBe(true);
    expect(pinTokenValid(row, token.slice(0, -1) + "x")).toBe(false);
    const changed = await upsertPublic(g.id, u.id, g.title, { pin: "abcd12" });
    expect(pinTokenValid(changed, token)).toBe(false);
    expect(pinTokenValid(changed, pinToken(changed))).toBe(true);
    const cleared = await upsertPublic(g.id, u.id, g.title, { pin: null });
    expect(cleared.pinHash).toBeNull();
    expect(pinTokenValid(cleared, pinToken(changed))).toBe(false);
    await expect(upsertPublic(g.id, u.id, g.title, { pin: "12" })).rejects.toThrow("pin");
    await expect(upsertPublic(g.id, u.id, g.title, { pin: "has space" })).rejects.toThrow("pin");
  });

  it("counts views, and the page disappears with the kit", async () => {
    const u = await user(); const g = gen(u.id); unlockGeneration(g.id, u.id);
    const row = await upsertPublic(g.id, u.id, g.title, { enabled: true });
    bumpViews(row.id); bumpViews(row.id);
    expect(getPublicByGeneration(g.id)).toMatchObject({ views: 2 });
    expect(getPublicByGeneration(g.id)!.lastViewedAt).toBeTruthy();
    deleteGeneration(g.id);
    expect(getPublicBySlug(row.slug)).toBeNull();
    const g2 = gen(u.id); unlockGeneration(g2.id, u.id);
    const row2 = await upsertPublic(g2.id, u.id, g2.title, { enabled: true });
    deletePublic(g2.id);
    expect(getPublicBySlug(row2.slug)).toBeNull();
    expect(serialise(getGeneration(g2.id)!).publicResume).toBeNull();
  });

  it("a locked kit exposes nothing about publishing", async () => {
    const u = await user(); const g = gen(u.id);
    await upsertPublic(g.id, u.id, g.title, { enabled: true });   // the route refuses this; the serialiser hides it regardless
    expect(serialise(g).publicResume).toBeNull();
  });
});
