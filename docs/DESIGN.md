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

---

## 4. Type scale

Two scales and a readout, each with its own ratio because they do different jobs. Sizes are in px so
they can be read against the screenshots; ship them as rem.

### 4.1 Document scale — Source Serif 4, ratio 6∶5 (1.2) from an 18px base

| Token | Size / line-height | Tracking | Weight | `opsz` | Used for |
|---|---|---|---|---|---|
| `doc-64` | 64 / 64 (1.00) | −0.024em | 600 | 60 | One display line per marketing page. Never two. |
| `doc-45` | 45 / 48 (1.07) | −0.020em | 600 | 44 | Page title on a funnel or tool page |
| `doc-31` | 31 / 38 (1.23) | −0.012em | 600 | 30 | Section head |
| `doc-26` | 26 / 34 (1.31) | −0.008em | 600 | 24 | Sub-section, panel title, résumé name line |
| `doc-21` | 21.5 / 32 (1.49) | −0.003em | 400 / 600 | 20 | Lead paragraph (400), small heading (600) |
| `doc-18` | 18 / 29 (1.61) | 0 | 400 | 14 | **Base prose.** Résumé body, cover letter, article copy |
| `doc-15` | 15 / 24 (1.60) | +0.004em | 400 | 10 | Dense prose, résumé bullets in the preview |
| `doc-12` | 12.5 / 19 (1.52) | +0.010em | 400 | 8 | Footnotes, source lines, print captions |

Tracking is negative above 26px and positive below 15px, because that is what optical sizing cannot
do on its own. `font-optical-sizing: auto` is on globally; the `opsz` column is set explicitly only
on `doc-64`, `doc-45` and `doc-12`, where the rendered size and the intended drawing differ.

### 4.2 Interface scale — Public Sans, ratio 9∶8 (1.125) from a 15px base

| Token | Size / line-height | Tracking | Weight | Used for |
|---|---|---|---|---|
| `ui-21` | 21 / 28 (1.33) | −0.008em | 600 | Dialog title, rail heading |
| `ui-19` | 19 / 26 (1.37) | −0.005em | 600 | Toolbar title |
| `ui-17` | 17 / 24 (1.41) | −0.002em | 600 | Primary button, prominent value |
| `ui-15` | 15 / 22 (1.47) | 0 | 400 / 500 | **Base interface text.** Field values, list rows, buttons |
| `ui-13` | 13 / 18 (1.38) | +0.005em | 400 / 500 | Metadata, help text, table header (500) |
| `ui-12` | 12 / 16 (1.33) | +0.010em | 500 | Dense table cell, chip, badge |
| `ui-11c` | 11 / 14 (1.27) | **+0.09em**, uppercase | 700 | The one micro-label (`eyebrow`). Caps need the tracking. |

`ui-11c` is the only uppercase style in the system. Anything else set in caps is a bug.

### 4.3 Machine readout — IBM Plex Mono

| Token | Size / line-height | Tracking | Weight | Used for |
|---|---|---|---|---|
| `mn-40` | 40 / 40 | −0.02em | 500 | The match score, the ATS score — the machine's verdict |
| `mn-24` | 24 / 28 | −0.01em | 500 | Secondary readouts (personalisation, keyword count) |
| `mn-15` | 15 / 24 | 0 | 400 | Extracted résumé text, the text a parser sees |
| `mn-13` | 13 / 20 | 0 | 400 / 500 | Keyword tokens, version ids, share URLs, redeem codes |

**Rule.** A number the *machine* produced is mono. A number the *person* pays or writes is Source
Serif 4 (which is duplexed, so it still aligns). Prices are serif. Scores are mono. This is the
difference between `R$ 149` and `89%`, and it should be visible without reading the label.

### 4.4 Measure

`--measure: 66ch` on prose, which resolves to roughly 600px at `doc-18`. Hard rules:

- Running prose never exceeds `--measure`, on any page, at any width.
- Résumé and cover-letter body inside the sheet: the sheet's own 816px minus margins ≈ 78ch. That is
  above the comfortable maximum on purpose — it is what prints, and parity beats comfort here.
- Table cells and form help are exempt.
- Hanging punctuation on pull quotes and on the résumé's bullet list: `hanging-punctuation: first
  allow-end` where supported, with `text-indent: -0.4em; padding-left: 0.4em` as the fallback so the
  bullet's own glyph optically aligns with the text above it.

---

## 5. Space, grid and radius

### 5.1 Spacing scale

A 4px grid. Only these values exist; anything else is a bug.

```
--s-1   2px     hairline nudges, icon optical centring
--s-2   4px     inside a chip
--s-3   8px     label → field
--s-4   12px    between related rows
--s-5   16px    block padding (compact)
--s-6   20px    block padding (default)
--s-7   24px    panel padding, grid gutter
--s-8   32px    between blocks
--s-9   40px    between sub-sections
--s-10  56px    between sections (mobile)
--s-11  72px    between sections (tablet)
--s-12  96px    between sections (desktop)
--s-13  128px   above a page-ending mark
```

Vertical rhythm: every vertical margin is a multiple of 4; inside prose, multiples of 8. Section
padding is `--s-10 / --s-11 / --s-12` by breakpoint — never one `py-20` for every section, which is
what flattens the landing today.

### 5.2 Grid

12 columns, `--gutter: 24px` desktop / `16px` below 768px, content `max-width: 1200px`. Four named
layouts; a screen picks one and states which.

| Layout | Shape | For |
|---|---|---|
| `L-prose` | 1 column, `--measure`, offset to columns 2–8 of 12 (not centred) | Legal, FAQ, article, long help |
| `L-editorial` | **7 / 1 / 4** — content, gutter, margin column | Landing sections, tool pages, the kit screen |
| `L-document` | 816px sheet + 320px rail, rail on the right ≥1280px, below the sheet under that | Kit delivery, editor, print preview, public CV |
| `L-tool` | 320px fixed rail + fluid pane, 1px rule between, no gap | Admin, applications board, library |

`L-editorial`'s 7/4 asymmetry is the default and does the most work: headings, prose and forms sit in
the 7, while meters, sources, notes and secondary actions sit in the 4. It replaces today's habit of
a centred `max-w-6xl` with a full-width grid of equal cards.

### 5.3 Radius

Radius encodes how much of a *document* an object is. The document itself has square corners,
because paper does.

```
--r-0    0px     the sheet, tables, the print preview, section rules, the proof band
--r-1    2px     inputs, chips, tokens, badges, checkboxes
--r-2    4px     buttons, menus, panels, popovers
--r-3    8px     dialogs and the mobile sheet only
--r-pill 999px   the language switch and avatars only
```

Uniform `rounded-2xl` on every surface is banned (§13). If two adjacent objects have the same radius
and the same border, one of them is wrong.

---

## 6. Colour

One idea: **the page is paper, the type is ink, and the only colour is a mark made on the page.**
Red is not the button colour — it is the proofreader's pencil. That frees the palette to carry the
product's real semantics, which are about a document being checked:

| Meaning | Name | Where it appears |
|---|---|---|
| The tool speaks / press this | **ink** | Primary buttons, the wordmark's first half, every heading |
| A mark on the document: unverified, invalid, removed, needs you | **mark** (oxblood) | Truth-check flags, invalid fields, destructive confirms, the wordmark's second half, the seal |
| Verified, kept, added and true | **kept** (moss) | Confirmed claims, added keywords, success |
| An open question, awaiting an answer | **query** (ochre) | Unanswered quantify prompts, pending payments, "we need a number here" |

There is no fifth colour. "Info blue" does not exist; informational text is ink.

### 6.1 Light — *Paper* (default)

Every ratio below is measured with the WCAG 2.x formula against the stated background
(`scratchpad/design/contrast.mjs`).

| Token | Value | On `page` | On `sheet` | Use |
|---|---|---|---|---|
| `--sheet` | `#FFFDF8` | 1.06 | — | The document surface. Nothing else uses it. |
| `--page` | `#FAF6EE` | — | 1.06 | App and marketing ground |
| `--sunken` | `#F2ECE0` | 1.09 | 1.16 | Inset wells, code/extract blocks, disabled fields |
| `--zebra` | `#EDE6D8` | 1.15 | 1.22 | Table row banding |
| `--rule-hairline` | `#E2D9C7` | 1.30 | 1.38 | Decorative separators inside a panel |
| `--rule` | `#D3C8B2` | 1.54 | 1.63 | Structural rules, table rules, panel edges |
| `--rule-field` | `#968970` | **3.19** | **3.38** | Every interactive edge — input, button outline, checkbox. Passes WCAG 1.4.11 (3:1). |
| `--ink-40` | `#8A7E68` | 3.70 | 3.92 | Placeholder and disabled text **only**. Never body copy. |
| `--ink-muted` | `#756A56` | **4.93** | **5.23** | Metadata, help, captions, source lines. AA at any size. |
| `--ink-2` | `#514839` | 8.34 | 8.84 | Secondary body, table cell prose |
| `--ink` | `#1C1913` | **16.26** | **17.25** | Primary text, primary button ground |
| `--mark` | `#8E2433` | 7.95 | 8.43 | White on it: **8.57** |
| `--mark-deep` | `#6E1B27` | 10.54 | 11.17 | Hover / pressed on a mark ground |
| `--mark-wash` | `#F6E7E6` | 1.11 | — | Flagged-row ground. ink on it 14.60, mark on it 7.14 |
| `--kept` | `#2C5A4A` | 7.30 | 7.74 | |
| `--kept-wash` | `#E6EFE9` | 1.09 | — | ink on it 14.93, kept on it 6.70 |
| `--query` | `#8A6318` | 5.02 | 5.33 | |
| `--query-wash` | `#F7EDD8` | 1.08 | — | ink on it 15.08, query on it 4.66 |
| `--select` | `#F0DFA8` | — | — | `::selection` ground; ink on it 13.21 |

### 6.2 Dark — *Desk lamp*

The chrome inverts. **The sheet never inverts** — a résumé is a printed artefact, and white-on-black
body text is not what the recruiter will see. The sheet only dims, from `#FFFDF8` to `#EDE7D9`,
as if lit by a lamp; `@media print` always restores pure white.

| Token | Value | On `desk` | On `raised` | Use |
|---|---|---|---|---|
| `--desk` | `#14120E` | — | 1.08 | App ground |
| `--desk-raised` | `#1D1A15` | 1.08 | — | Panels, header, popovers |
| `--desk-sunken` | `#0E0C09` | 1.04 | 1.13 | Wells, extract blocks |
| `--sheet` | `#EDE7D9` | 15.17 | — | The dimmed sheet. ink on it **14.22** |
| `--rule-hairline` | `#2A251D` | 1.23 | 1.14 | |
| `--rule` | `#3A3327` | 1.50 | 1.39 | |
| `--rule-field` | `#786D57` | **3.67** | **3.41** | Interactive edges. Passes 3:1. |
| `--ink-40` | `#8A806C` | 4.80 | 4.45 | Placeholder / disabled |
| `--ink-muted` | `#A0957F` | 6.32 | **5.86** | Metadata, help |
| `--ink-2` | `#C0B6A0` | 9.30 | 8.62 | Secondary body |
| `--ink` | `#F2EDE1` | **16.01** | 14.85 | Primary text; also the primary button ground (desk on it 16.01) |
| `--mark` | `#E08A93` | **7.33** | 6.79 | |
| `--mark-wash` | `#2A1418` | 1.08 | — | ink on it 14.84, mark on it 6.79 |
| `--kept` | `#7FC4AC` | 9.26 | 8.58 | |
| `--kept-wash` | `#132520` | 1.17 | — | ink on it 13.69, kept on it 7.92 |
| `--query` | `#D8A94A` | 8.64 | 8.01 | |
| `--query-wash` | `#241B0E` | 1.10 | — | ink on it 14.52, query on it 7.83 |

**Sheet-scoped override.** Inside `.sheet` in dark mode, `--ink-muted` becomes `#6A5F4D` (5.07 on
the dimmed sheet; `#756A56` would drop to 4.31 and fail) and `--rule-field` becomes `#7E7259`. The
sheet carries its own small token block rather than inheriting the desk's.

### 6.3 Rules

- **Theme switching.** Tokens are declared on `:root` (light) and redefined under
  `@media (prefers-color-scheme: dark)` guarded as `:root:not([data-theme="light"])`, then again
  under `:root[data-theme="dark"]`. No colour gets its only definition inside a media query.
- **The accent is rationed.** On any one screen, `--mark` may ink at most: one seal, the flagged
  rows, and one text link. If a screen has a red button and a red heading and red bullets, it is
  wrong. The landing's full-bleed oxblood CTA band is deleted.
- **No gradient carries meaning.** The one permitted gradient is the 1px ink→transparent hairline
  that fades a rule out at the edge of the sheet. No colour-to-colour gradients anywhere (§13).
- **Grain stays, at half strength.** The paper texture is part of the identity, but at
  `rgba(28,25,19,.022)` on a 3px grid — currently `.035`, which visibly dithers text edges at 13px.
  It is disabled inside `.sheet` (the document is clean paper) and under `print`.

---

## 7. Density, depth and motion

### 7.1 Density is a decision

Two densities, chosen per surface and stated in the surface's file header. Same tokens, different
values; nothing else changes.

| Token | `comfortable` | `compact` | |
|---|---|---|---|
| `--control-h` | 44px | 32px | Button, input, select height |
| `--control-h-sm` | 36px | 28px | Inline / toolbar controls |
| `--row-h` | 56px | 36px | List and table row |
| `--cell-y` / `--cell-x` | 12px / 16px | 6px / 12px | Table cell padding |
| `--pane-pad` | 24px | 16px | Panel padding |
| body step | `ui-15` | `ui-13` | |
| label step | `ui-13` | `ui-12` | |

- **Comfortable**: marketing, `/start` funnel, the sheet and everything inside it, legal, account,
  pricing, the public CV.
- **Compact**: library list, applications board, admin, the editor's field column, the truth-check
  list, versions, the admin tables.
- **Coarse pointers override.** Under `@media (pointer: coarse)`, `--control-h` is forced to 44px
  and `--row-h` to 48px even on compact surfaces. A phone is never dense.

### 7.2 Depth, in order of preference

Reach for these in order. A shadow is the *fourth* choice, not the first.

1. **A rule.** `1px solid var(--rule)`. On retina, a 1px CSS border is 2 device pixels and holds;
   never use `0.5px`, and never fake a rule with a `2px` background that renders soft.
2. **A background step.** `--page` → `--sheet` (raised) or `--page` → `--sunken` (inset).
3. **An inset.** `box-shadow: inset 0 1px 0 var(--rule-hairline)` at the top of a well.
4. **A shadow.** Two only, and only for things that genuinely float:
   ```
   --shadow-pop: 0 1px 2px rgba(28,25,19,.06), 0 8px 24px -12px rgba(28,25,19,.28);
   --shadow-sheet: 0 1px 0 rgba(28,25,19,.05), 0 24px 48px -32px rgba(28,25,19,.35);
   ```
   `--shadow-pop` for popovers, menus, dialogs and the header once scrolled. `--shadow-sheet` for the
   document sheet, which is the one object allowed to look like a physical page. In dark mode both
   shadows are replaced by a `--rule` border plus the `--desk-raised` step, because shadows do not
   read on a dark ground.

A panel that sits *in* the page gets a rule and nothing else. Today every panel has a shadow, which
is why nothing on the kit screen looks more important than anything else.

### 7.3 Motion

```
--dur-1: 120ms   state change on a control (hover, press, check)
--dur-2: 180ms   a thing appearing in place (popover, inline error, row insert)
--dur-3: 260ms   a thing arriving from elsewhere (dialog, drawer, step transition)
--ease-out:  cubic-bezier(.2, .8, .3, 1)     entering
--ease-in:   cubic-bezier(.5, 0, .9, .3)     leaving
--ease-move: cubic-bezier(.4, 0, .2, 1)      position/size only
```

- Only `opacity`, `transform` and `background-color` are animated. Never `height`, `width`, `top`
  or `box-shadow`.
- Entering moves ≤ 8px. Nothing slides across the screen.
- The score meter fills once, over `--dur-3`, on first appearance only — never on re-render.
- `@media (prefers-reduced-motion: reduce)`: all durations become `1ms`, the meter renders at its
  final value, the listening pulse becomes a static ring, and the marquee on the role ticker stops
  (today it runs regardless, which is a WCAG 2.2.2 failure since it is longer than 5s and has no
  pause control — the ticker either gains a pause control or is deleted).

### 7.4 Icons

**No icon package.** One local sprite, `public/icons.svg`, containing `<symbol>` elements that we
draw and own, used as `<svg><use href="/icons.svg#name"/></svg>` with `aria-hidden` unless the icon
is the only label.

- **Two optical sizes, drawn separately, never scaled:** `16` (inline, dense rows, chips) and `20`
  (buttons, nav, section marks). A 20px icon shrunk to 16px is banned — the stroke thins and it
  stops matching the type.
- **One stroke weight:** 1.5px at 20px, 1.25px at 16px, `stroke-linecap: round`,
  `stroke-linejoin: round`, `vector-effect: non-scaling-stroke`. Butt caps and filled shapes only for
  the two brand glyphs.
- **Optical alignment:** an icon beside `ui-15` text sits on the text's cap-height, not its box —
  `translateY(-0.5px)` on the 16px set, verified against a baseline overlay.
- **Inventory (28).** `mic`, `keyboard`, `document`, `sheet-stack`, `download`, `print`, `pencil`,
  `check`, `close`, `flag`, `search`, `link`, `external`, `chevron-down`, `chevron-right`,
  `arrow-right`, `arrow-left`, `plus`, `minus`, `drag`, `trash`, `copy`, `eye`, `lock`, `globe`,
  `play`, `history`, `menu`, plus exactly two brand marks: `linkedin`, `whatsapp`.
- **Emoji are not icons.** Every emoji listed in D7 is replaced by a sprite symbol or by a word.
  Emoji stay only where they are *content* — inside a user's own text.

---

## 8. Borders, fields and the focus ring

- Every interactive edge is `1px solid var(--rule-field)` — 3.19:1 light, 3.67:1 dark, so a field is
  discernible without relying on its placeholder.
- **Focus** is one ring, identical everywhere: `outline: 2px solid var(--mark); outline-offset: 2px;`
  on `:focus-visible` only. Measured 7.95:1 against `--page` and 7.33:1 against `--desk`, so it
  passes 3:1 non-text contrast with room to spare. The `outline-offset` means it never overlaps the
  control's own border, which is how it stays visible on dark grounds and on the sheet.
- `:focus` without `:focus-visible` never draws a ring (no mouse-click rings).
- **Never** `box-shadow: 0 0 0 3px rgba(...)` as a focus indicator: it is invisible at 3:1 against the
  paper and it is what the app uses today.
- Field states, all designed (§11): rest, hover, focus, filled, invalid, disabled, read-only,
  loading, and with a character counter when a `maxLength` exists.
