import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { VARIANT_KINDS, isVariantKind, mockVariant } from "@/lib/ai/variants";

const DIR = path.join(process.cwd(), "data", "unit-variants");
process.env.DATA_DIR = DIR;
fs.rmSync(DIR, { recursive: true, force: true });

const { createUser } = await import("@/lib/server/users");
const { saveGeneration, deepenGeneration, deleteGeneration } = await import("@/lib/server/generations");
const { mockKit } = await import("@/lib/ai/kit");
const { getVariant, listVariants, saveVariant, clearVariants } = await import("@/lib/server/variants");

const kit = mockKit({ mode: "tailor", targetRole: "Growth Lead", lang: "pt", resume: "x", jobDescription: "y" });
const args = { kit, title: "Alex Ribeiro", targetRole: "Growth Lead", posting: "posting" };

describe("kinds and fixtures", () => {
  it("knows its seven kinds", () => {
    expect(VARIANT_KINDS).toHaveLength(7);
    expect(isVariantKind("cover:warm")).toBe(true);
    expect(isVariantKind("email:nudge")).toBe(true);
    expect(isVariantKind("cover:sarcastic")).toBe(false);
  });
  it("writes each tone differently, in the kit's language, signed by the candidate, with no subject on a letter", () => {
    const bodies = (["formal", "warm", "direct", "confident"] as const).map((t) => mockVariant({ ...args, lang: "pt", kind: `cover:${t}` }));
    expect(new Set(bodies.map((b) => b.body)).size).toBe(4);
    for (const b of bodies) { expect(b.subject).toBe(""); expect(b.body).toContain("Alex Ribeiro"); expect(b.body).toContain("Growth Lead"); }
    expect(bodies[0].body).toMatch(/^Prezada/);
    expect(mockVariant({ ...args, lang: "en", kind: "cover:formal" }).body).toMatch(/^Dear/);
    expect(mockVariant({ ...args, lang: "es", kind: "cover:formal" }).body).toMatch(/^Estimado/);
  });
  it("gives emails a subject and bracketed placeholders for what only the candidate knows", () => {
    for (const k of ["applied", "thanks", "nudge"] as const) {
      const v = mockVariant({ ...args, lang: "en", kind: `email:${k}` });
      expect(v.subject).toContain("Growth Lead");
      expect(v.body).toMatch(/\[[^\]]+\]/);
    }
  });
});

describe("cache", () => {
  const user = createUser({ email: "var@example.com", password: "password123" });
  const gen = () => saveGeneration({ userId: user.id, anonId: null, mode: "tailor", source: "text", lang: "pt", targetRole: "Growth Lead", input: { jobDescription: "y".repeat(40), resume: "x" }, kit, model: "mock", costUsd: 0 });

  it("stores one row per kit + kind, replaces on conflict, and lists them", () => {
    const g = gen();
    expect(getVariant(g.id, "cover:warm")).toBeNull();
    const a = saveVariant({ generationId: g.id, kind: "cover:warm", variant: { subject: "", body: "one" }, model: "mock", costUsd: 0.001 });
    const b = saveVariant({ generationId: g.id, kind: "cover:warm", variant: { subject: "", body: "two" }, model: "mock", costUsd: 0.001 });
    expect(b.id).toBe(a.id);
    expect(getVariant(g.id, "cover:warm")!.body).toBe("two");
    saveVariant({ generationId: g.id, kind: "email:thanks", variant: { subject: "s", body: "b" }, model: "mock", costUsd: 0 });
    expect(listVariants(g.id).map((v) => v.kind).sort()).toEqual(["cover:warm", "email:thanks"]);
    clearVariants(g.id);
    expect(listVariants(g.id)).toEqual([]);
  });
  it("is cleared when the kit is deepened, and gone when the kit is deleted", () => {
    const g = gen();
    saveVariant({ generationId: g.id, kind: "cover:direct", variant: { subject: "", body: "old" }, model: "mock", costUsd: 0 });
    deepenGeneration(g.id, kit, "mock", 0);
    expect(listVariants(g.id)).toEqual([]);
    saveVariant({ generationId: g.id, kind: "email:nudge", variant: { subject: "s", body: "b" }, model: "mock", costUsd: 0 });
    deleteGeneration(g.id);
    expect(getVariant(g.id, "email:nudge")).toBeNull();
  });
});
