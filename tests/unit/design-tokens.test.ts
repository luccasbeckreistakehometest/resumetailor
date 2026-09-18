import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The design system's rules that a human reviewer cannot hold in their head (docs/DESIGN.md §6).
 * These are cheap assertions over the stylesheet itself: they catch the two failures that would
 * otherwise only show up on a user's screen — a dark theme that drifts between its two declaration
 * sites, and a colour whose only definition lives inside a media query.
 */
const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

const darkBlocks = [...css.matchAll(/\/\* THEME:DARK:BEGIN \*\/([\s\S]*?)\/\* THEME:DARK:END \*\//g)].map((m) => m[1]);
const tokensIn = (block: string) => new Set([...block.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]));

describe("theme tokens", () => {
  it("declares the dark theme twice — for the system preference and for an explicit choice", () => {
    expect(darkBlocks).toHaveLength(2);
  });

  it("keeps the two dark declarations identical, character for character", () => {
    expect(darkBlocks[1]).toBe(darkBlocks[0]);
  });

  it("gives no colour its only definition inside a media query", () => {
    const root = css.slice(css.indexOf(":root {"), css.indexOf("[data-density="));
    const rootTokens = tokensIn(root);
    for (const token of tokensIn(darkBlocks[0])) expect(rootTokens, `${token} is missing from :root`).toContain(token);
  });

  it("keeps the retired faces out of the stylesheet", () => {
    expect(css).not.toMatch(/font-fraunces|font-inter/);
  });

  it("never uses a translucent box-shadow as a focus indicator", () => {
    // The ring is `outline: 2px solid var(--mark)`; a 3px rgba() shadow measures ~1.1:1 on paper.
    const focusRules = [...css.matchAll(/:focus[^{]*\{([^}]*)\}/g)].map((m) => m[1]);
    for (const rule of focusRules) expect(rule).not.toMatch(/box-shadow:\s*0 0 0/);
  });

  it("never leaves an arbitrary text utility ambiguous", () => {
    // Tailwind cannot tell whether text-[var(--x)] is a colour or a size, and silently picks
    // font-size: that is how a primary button shipped with ink-on-ink, 1:1, invisible. Found by
    // rendering the gallery and reading the computed colour. Every one carries a type hint now.
    const root = new URL("../../", import.meta.url).pathname;
    const files = ["components", "app"].flatMap((dir) =>
      readdirSync(root + dir, { recursive: true, encoding: "utf8" })
        .filter((f) => f.endsWith(".tsx"))
        .map((f) => `${root}${dir}/${f}`));
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/text-\[(?!color:|length:)[^\]]*var\(/g)) bad.push(`${f}: ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });

  it("uses the radius ladder rather than one rounded corner for everything", () => {
    for (const r of ["--r-0", "--r-1", "--r-2", "--r-3", "--r-pill"]) expect(css).toContain(`${r}:`);
    // 14px was the old universal .card radius; 16px/24px are Tailwind's rounded-2xl/3xl.
    expect(css).not.toMatch(/border-radius:\s*(14|16|24)px/);
  });
});

/**
 * Surface 3: the document stylesheet. Four of the six print themes were built on #4f46e5 indigo
 * and Arial; nothing in this product is either. These assertions are what stops them coming back.
 */
describe("the document stylesheet", () => {
  // From the end of the section comment: the comment itself names the colours it retired.
  const doc = css.slice(css.indexOf(".doc-ats, .doc-modern"));

  it("has no indigo, no slate and no Arial-first stack left in it", () => {
    expect(doc).not.toMatch(/#4f46e5|#6366f1|#e0e7ff|#1e293b|#0f172a/i);
    expect(doc).not.toMatch(/font-family:\s*Arial/i);
  });

  it("sets the document in the document face and the section head in the interface face", () => {
    expect(doc).toContain("font-family: var(--font-serif)");
    expect(doc).toContain("font-family: var(--font-sans), Arial, sans-serif");
  });

  it("measures the document in points, because it is a page before it is a screen", () => {
    const body = doc.slice(0, doc.indexOf(".doc-ats h1"));
    expect(body).toMatch(/font-size:\s*10\.5pt/);
    expect(body).not.toMatch(/font-size:\s*\d+px/);
  });
});

/**
 * Two utilities from the same group on one element are resolved by stylesheet order, not by the
 * order they were written. That cost the account page its measure (a max-w-3xl that never applied)
 * and pushed the mobile menu button off the edge (a `hidden` that lost to `inline-flex`). This is
 * the cheap check that stops the pattern coming back in the product's own files.
 */
describe("no utility fights another utility in the same group", () => {
  // Comments are stripped first: this very rule is explained in a comment that quotes the bug.
  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const files = readdirSync(new URL("../../components", import.meta.url), { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => strip(readFileSync(new URL(`../../components/${f}`, import.meta.url), "utf8")));

  it("never sets a max-width on <Container> through className", () => {
    for (const src of files) expect(src).not.toMatch(/<Container[^>]*className="[^"]*max-w-/);
  });
});
