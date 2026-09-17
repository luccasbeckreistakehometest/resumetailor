import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "@/app/(site)/legal/content/cookies";
import { refunds } from "@/app/(site)/legal/content/refunds";
import { privacy } from "@/app/(site)/legal/content/privacy";
import type { LegalDoc } from "@/app/(site)/legal/content/types";

const ROOT = process.cwd();
const text = (doc: LegalDoc) => JSON.stringify(doc);

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) sources(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

describe("cookie notice", () => {
  it("names every cookie and storage key the code uses, in every language", () => {
    const files = [...["app", "components", "lib"].flatMap((d) => sources(path.join(ROOT, d))), path.join(ROOT, "proxy.ts")]
      .filter((f) => !f.includes(`${path.sep}legal${path.sep}content${path.sep}`));
    const keys = new Set<string>();
    for (const f of files) for (const m of fs.readFileSync(f, "utf8").matchAll(/"(rt_[a-z0-9_]+)"/g)) keys.add(m[1]);
    expect(keys.size).toBeGreaterThan(8);
    for (const lang of ["en", "pt", "es"] as const) {
      for (const key of keys) expect(text(cookies[lang]), `${lang}: ${key}`).toContain(key);
    }
  });

  it("no longer claims there is no analytics, and says how to opt out", () => {
    expect(text(cookies.en)).not.toMatch(/no advertising or analytics cookies/i);
    expect(text(cookies.pt)).not.toMatch(/nem de analytics/i);
    expect(text(cookies.es)).not.toMatch(/ni de analítica/i);
    for (const lang of ["en", "pt", "es"] as const) {
      expect(text(cookies[lang])).toContain("180");
      expect(text(cookies[lang])).toContain("Global Privacy Control");
    }
  });
});

describe("privacy policy", () => {
  it("describes the first-party statistics and their retention in every language", () => {
    expect(text(privacy.en)).not.toMatch(/no advertising or analytics cookies/i);
    expect(text(privacy.pt)).not.toMatch(/publicidade ou de analytics\./i);
    expect(text(privacy.es)).not.toMatch(/ni de analítica\./i);
    for (const lang of ["en", "pt", "es"] as const) {
      expect(text(privacy[lang])).toContain("UTM");
      expect(text(privacy[lang])).toContain("180");
    }
  });
});

describe("refund policy", () => {
  it("says referral credits go when the purchase that earned them is refunded", () => {
    expect(text(refunds.en)).toMatch(/referral credits/);
    expect(text(refunds.pt)).toMatch(/créditos de indicação/);
    expect(text(refunds.es)).toMatch(/créditos de referido/);
  });
});
