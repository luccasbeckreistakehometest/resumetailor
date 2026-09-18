# ResumeTailor — Ofício do Documento

The design system. Version 2, September 2026. Supersedes the "Paper & Ink" look described at the
top of `app/globals.css`.

---

## 1. Thesis

ResumeTailor makes one thing: a document a stranger will read in nine seconds, after a machine has
already read it. So the interface is built like a well-set book — a text face chosen for reading, a
civic sans for the chrome around it, a monospace for everything the machine says — and the résumé
itself is the largest, best-set object on every screen it appears on. Colour is almost absent: the
page is paper, the type is ink, and the single red is a proofreader's mark that means *this needs
your attention*, never *this is a button*. What the candidate reads on screen is set in the same
faces, at the same relative sizes, as what comes out of the printer.

---

## 2. What is wrong today

Written after building the app (`scripts/e2e-server.sh`, production build, seeded kit) and reading
every screenshot at 1440×900 and 390×844. Evidence, not taste, first.

### 2.1 Measured defects

| # | Defect | Evidence |
|---|---|---|
| D1 | **Fraunces cannot set a number in a column.** Measured at 100px: the string `111111` is 214.9px wide, `000000` is 355.7px. `font-variant-numeric: tabular-nums` changes nothing — Fraunces ships no working `tnum`. Every headline figure in the product is set in Fraunces: `89%` match, `78%` personalisation, `100/100`, `R$ 149`, all eight admin stat cards. | `scratchpad/design/tnum-probe.mjs` |
| D2 | **The printed document is a different brand from the app.** Four of the six `.doc-*` print themes (`modern`, `compact`, `bold`, `designed`) are built on `#4f46e5` indigo and Inter. The app is oxblood and Fraunces. The `.docx` export (`lib/resume/export.ts:29,53`) is Calibri. One résumé, three identities. | `app/globals.css`, `lib/resume/export.ts` |
| D3 | **The header breaks at 1440px when signed in.** Eight nav items plus e‑mail, credits and a CTA overflow, so `ATS check`, `Am I a fit?`, `Compare jobs`, `My CVs`, `Sign out` and `Start free` each wrap onto two lines. | `08-library-1440.png`, `09-editor-1440.png`, `11-applications-1440.png`, `18-admin-1440.png` |
| D4 | **The library row destroys its own content.** The kit title renders as `Alex …` (8 characters) and its metadata wraps over eight lines inside a ~55px column, because `min-w-0 flex-1` competes with eight unshrinkable buttons in one `flex-wrap` row. | `08-library-1440.png` |
| D5 | **The résumé is never shown at delivery.** On the unlocked kit screen the tailored résumé — the thing that was bought — exists only behind a *Save as PDF / Print* button. Ten stacked panels appear before it. | `07-kit-unlocked-1440.png` |
| D6 | **Three meters, three designs.** Match (41→89), Personalisation (78%) and Sounds human (100/100) each use a different bar, a different label position and a different numeral treatment on the same screen. | `07-kit-unlocked-1440.png` |
| D7 | **Emoji do the work of an icon set.** 🎙 🎬 🌐 🔒 ✎ 🔢 🔎 🗣 📄 🤝 ⬇ 🕐 🎟 appear as section marks and as the only label on three buttons. Two library buttons are emoji-only; a third is the literal text `in`. | landing, library, kit, editor, pricing |
| D8 | **The funnel wastes the viewport.** `/start` step 1 is two identical rounded cards in the top 45% of the screen with the footer pulled up under them; the form steps nest a card inside a page inside a container with no work done by any of the three. | `02-start-choose-1440.png`, `04-start-form-job-1440.png` |
| D9 | **Nothing is a table.** Keyword coverage, before/after, applications by stage, admin figures — all tabular data, all rendered as cards. The one real table (admin, recent kits) has no zebra, no rules and left-aligns its numeric columns. | `18-admin-1440.png`, `11-applications-1440.png` |
| D10 | **KPI-card grids.** Applications: six identical cards, all reading `0`. Admin: eight identical cards in 4×2. This is the single most recognisable "generated dashboard" shape. | `11-applications-1440.png`, `18-admin-1440.png` |

### 2.2 Why it reads as junior / AI-made

- **One shape for everything.** `.card` is `radius 14px + 1px border + one drop shadow`, and it is used
  for a feature blurb, a form, a price, a metric, a list row and an empty state. When every object has
  the same silhouette, nothing has rank. Depth comes only from that one shadow; there is no use of
  rules, insets, background steps or margin as structure.
- **The page is a stack of bands.** The landing is seven full-bleed sections, each `py-20`, each with a
  left-aligned heading in the same place, each followed by an equal-width grid. There is no column
  system, no asymmetry, no change of measure, and nothing anchors the eye.
- **Eleven equal feature cards.** `01`–`11` in a three-column grid leaves two orphans on the last row.
  It is the banned "three equal feature cards" pattern with the count turned up.
- **The accent is spent on decoration.** A full-bleed oxblood CTA band, oxblood numerals, oxblood
  headings inside the interview plan, oxblood download links, oxblood bullets — so when oxblood
  finally means *unverified claim, confirm this*, it carries no signal.
- **Type is doing no work below the headline.** Fraunces sets every heading at sizes that differ per
  page by ad-hoc Tailwind values (`text-[2.75rem]`, `text-4xl`, `text-3xl`, `text-[2.6rem]`); body is
  Inter 13–18px with no documented scale, no tracking per size and no measure control.
- **Every state is the default state.** Focus is the browser ring or a 3px translucent box; disabled is
  `opacity .55`; loading, empty and error appear ad hoc (the grey `Save` and `Grant` buttons read as
  disabled when they are not); long content is never designed for, which is how D4 happens.
- **The chat bubble.** A solid circle bottom-right, overlapping card content at 390px.

None of this is a matter of preference. Each line above points at a screenshot or a measurement.

---

## 3. Typefaces

Three voices, because the product has exactly three speakers: the candidate's document, the tool,
and the machine that parses the document. All three are on Google Fonts and are self-hosted by
`next/font/google`, so no third-party request is made at runtime.

### 3.1 Source Serif 4 — the document voice

```ts
import { Source_Serif_4 } from "next/font/google";
const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin", "latin-ext"],   // latin-ext covers pt-BR and es
  axes: ["opsz"],                    // 8–60; weight 200–900 is the default axis
  display: "swap",
});
```

- **Why.** It is a text face first — drawn by Frank Grießhammer for reading at 9–14pt — with a real
  optical-size axis, which is the mechanism a foundry gives you for setting one family at both 13px
  and 64px without it looking like the same drawing scaled. It has a modest x-height (measured: 45.2
  at 100px vs Inter's 54.6), which is what gives a page of prose an even colour instead of a grey
  slab. It is not fashionable, which is the point.
- **Figures are duplexed.** Measured: `111111` and `000000` are both 282px at 100px — every digit is
  47 units wide. Numbers in a résumé, in a table and in a heading line up with no `tnum` needed.
  This is the direct answer to D1.
- **Weights used.** 400 text, 600 headings, 700 only for the wordmark and the largest display line.
  Never 200/300 — the thin masters fall apart against paper at body sizes.
- **Optical size.** `font-optical-sizing: auto` globally, plus explicit `font-variation-settings:
  "opsz" <n>` on the display steps (below). Browsers apply `opsz` from the rendered size automatically;
  the explicit values exist for the two cases where we set type larger than we want it drawn.
- **Fallback stack.** `Source Serif 4, "Source Serif Pro", Charter, "Bitstream Charter", Georgia,
  "Times New Roman", serif`. Charter is present on macOS and iOS and is metrically close; Georgia is
  the universal safety net.

### 3.2 Public Sans — the interface voice

```ts
import { Public_Sans } from "next/font/google";
const sans = Public_Sans({ variable: "--font-sans", subsets: ["latin", "latin-ext"], display: "swap" });
```

- **Why.** It descends from Libre Franklin and was drawn for the US Web Design System — it is
  literally a face for government forms. That is the right lineage for a product called *ofício*: it
  is precise, unfashionable, slightly bureaucratic, and it disappears. It never sets a headline; its
  job is labels, nav, buttons, table headers, metadata, form help and legal text.
- **Figures.** Proportional by default (measured `111111` 244.1px vs `000000` 363.8px at 100px) and
  `font-variant-numeric: tabular-nums` **works** (both become 420px). So: proportional in prose,
  tabular the moment numbers sit in a column. See §9.
- **Weights used.** 400 body/meta, 500 labels and table headers, 600 buttons and emphasis, 700 for
  the rare all-caps micro-label. Nothing above 700.
- **Fallback stack.** `Public Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, sans-serif`.

### 3.3 IBM Plex Mono — the machine voice

```ts
import { IBM_Plex_Mono } from "next/font/google";
const mono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], display: "swap" });
```

- **Why.** Everything the parser says should look like the parser said it: ATS extracted text,
  keyword tokens, the score readout, version ids, file names, diff markers, the share URL, the
  redeem code. Plex Mono is a designed mono with real text colour rather than a code-editor face,
  and it sits comfortably beside a serif.
- **Weights used.** 400, 500 (token chips), 600 (score readouts).
- **Fallback stack.** `IBM Plex Mono, ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas,
  monospace`.

### 3.4 Retired

**Fraunces** and **Inter** are removed. Fraunces because of D1 and because a soft, wonky display
serif is a costume; Inter because it is the default face of every generated interface and the brief
bans it as a headline face. The wordmark is redrawn in Source Serif 4 600 with the `Tailor` half in
the mark colour, so the logo keeps its shape.

### 3.5 x-height parity

Measured x-heights at 100px: Source Serif 4 **45.2**, Public Sans **51.7**. To make a serif line and
a sans line look the same size, the sans must be set at **0.874×** the serif size. This is a rule of
the system, not an accident:

| Pairing in the wild | Serif | Sans |
|---|---|---|
| Document body next to a field label | 18px | 15px (18 × .874 = 15.7 → 15 with the label at 500) |
| Section heading next to its eyebrow | 24px | 11px caps (a deliberate contrast, not parity) |
| Table cell prose next to a numeric column | 15px | 13px |

Never set the two faces at the same px value in the same line of reading.
