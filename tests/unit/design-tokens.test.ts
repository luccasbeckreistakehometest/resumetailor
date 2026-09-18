import { readFileSync } from "node:fs";
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

  it("uses the radius ladder rather than one rounded corner for everything", () => {
    for (const r of ["--r-0", "--r-1", "--r-2", "--r-3", "--r-pill"]) expect(css).toContain(`${r}:`);
    // 14px was the old universal .card radius; 16px/24px are Tailwind's rounded-2xl/3xl.
    expect(css).not.toMatch(/border-radius:\s*(14|16|24)px/);
  });
});
