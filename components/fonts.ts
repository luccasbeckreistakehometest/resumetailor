import { IBM_Plex_Mono, Public_Sans, Source_Serif_4 } from "next/font/google";

/**
 * The three voices of the product (docs/DESIGN.md §3). All self-hosted by next/font, so no request
 * leaves the machine at runtime and the font files are served from our own origin.
 *
 *   --ff-serif   Source Serif 4  the document voice — headings, prose, the résumé, money
 *   --ff-sans    Public Sans     the interface voice — labels, nav, buttons, table headers
 *   --ff-mono    IBM Plex Mono   the machine voice — scores, tokens, ids, extracted text
 *
 * `adjustFontFallback` is left at its default (on): next measures each face and emits an
 * @font-face for the local fallback with matched ascent/descent/line-gap and size-adjust, so the
 * swap from the fallback stack to the webfont does not move a single line. The explicit `fallback`
 * arrays below are the faces those metrics are computed against, in the order a machine without
 * the webfont should try them.
 *
 * Retired here: Fraunces (no working `tnum` — D1) and Inter (banned as a headline face).
 */

export const serif = Source_Serif_4({
  variable: "--ff-serif",
  subsets: ["latin", "latin-ext"], // latin-ext carries pt-BR and es
  axes: ["opsz"], // 8–60; wght stays variable 200–900
  display: "swap",
  fallback: ["Source Serif Pro", "Charter", "Bitstream Charter", "Georgia", "Times New Roman", "serif"],
});

export const sans = Public_Sans({
  variable: "--ff-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

export const mono = IBM_Plex_Mono({
  variable: "--ff-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"], // Plex Mono ships static masters, not a variable file
  display: "swap",
  fallback: ["ui-monospace", "SF Mono", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

/** The class the <html> element carries so every --font-* custom property is in scope. */
export const fontVariables = `${serif.variable} ${sans.variable} ${mono.variable}`;
