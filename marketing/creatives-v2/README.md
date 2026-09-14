# ResumeTailor — Ad Creatives v2

Art-directed paid-social creatives for **ResumeTailor** (paste a job description + resume → AI-tailored resume + cover letter + LinkedIn About in ~30s, one-time **$9 / R$39**).

Each file is a **self-contained HTML** creative (inline CSS; only external resource = Google Fonts). Open in a browser at exact pixel dimensions and screenshot-export to PNG. Start with **`index.html`** — a gallery grouped by niche, with live scaled thumbnails and "open full size" links.

> **Do not edit the old `marketing/creatives/` folder.** Everything here is independent.

---

## Files by niche

### 🌐 Global (EN + ES)
| File | Concept | Lang | Size |
|---|---|---|---|
| `global-matchscore-en-1080x1080.html` | Match Score gauge (38→91%) ★ | EN | 1080×1080 |
| `global-matchscore-en-1080x1920.html` | Match Score — Story | EN | 1080×1920 |
| `global-7seconds-en-1080x1080.html` | 7 Seconds — stopwatch skim | EN | 1080×1080 |
| `global-7seconds-es-1080x1080.html` | 7 Segundos | ES | 1080×1080 |
| `global-beatrobot-en-1200x628.html` | Beat the Robot — ATS Rejected→Approved | EN | 1200×628 |
| `global-noexperience-en-1080x1080.html` | No Experience — blank→built | EN | 1080×1080 |
| `global-chatgptvskit-en-1200x628.html` | Text vs hired-ready Kit | EN | 1200×628 |

### 🇧🇷 Brasil (pt-BR, made-for-Brazil)
| File | Concept | Lang | Size |
|---|---|---|---|
| `br-gupy-ptbr-1080x1080.html` | Barrado pela Gupy — antes/depois ★ | pt-BR | 1080×1080 |
| `br-gupy-ptbr-1080x1920.html` | Gupy — Story (funil/robô) | pt-BR | 1080×1920 |
| `br-7segundos-ptbr-1080x1080.html` | 7 Segundos — triagem | pt-BR | 1080×1080 |
| `br-primeiroemprego-ptbr-1080x1080.html` | Primeiro Emprego — em branco→pronto | pt-BR | 1080×1080 |

★ = strongest concept for that niche.

Filename convention: **`niche-concept-lang-size.html`** (e.g. `global-7seconds-en-1080x1080.html`, `br-gupy-ptbr-1080x1920.html`).

---

## Export to PNG

Each creative's **root `.creative` element is the exact ad size**, sitting on a neutral page background so you can frame the screenshot precisely. Pick whichever method fits your tooling.

### A. Headless Chrome (cleanest, exact pixels — recommended for batch)
The `.creative` is full-bleed at its declared size, so a full-page screenshot of the viewport at that size captures it 1:1.
```bash
# one file (macOS Chrome path shown)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --force-device-scale-factor=2 \
  --window-size=1080,1080 \
  --screenshot=global-matchscore-en-1080x1080.png \
  "file:///Users/luccasbeckreis/Documents/resume-tailor/marketing/creatives-v2/global-matchscore-en-1080x1080.html"
```
- Match `--window-size` to the creative's pixel size (1080,1080 / 1080,1920 / 1200,628).
- `--force-device-scale-factor=2` gives crisp 2× output (e.g. 2160×2160). Drop it for exact 1×.

### B. Browser DevTools (no install)
1. Open the file in Chrome → DevTools (⌘⌥I) → toggle device toolbar (⌘⇧M).
2. Set the dimensions to the creative size (e.g. 1080×1080) and zoom to 100%.
3. ⋮ menu → **Capture full size screenshot** (or "Capture node screenshot" on the `.creative` element for an exact crop).

### C. Puppeteer / Playwright (programmatic batch)
```js
// playwright: npx playwright install chromium first
const { chromium } = require('playwright');
const sizes = { '1080x1080':[1080,1080], '1080x1920':[1080,1920], '1200x628':[1200,628] };
(async () => {
  const b = await chromium.launch();
  for (const f of require('fs').readdirSync('.').filter(f=>f.endsWith('.html') && f!=='index.html')) {
    const key = f.match(/(\d+x\d+)/)[1]; const [w,h] = sizes[key];
    const p = await b.newPage({ viewport:{ width:w, height:h }, deviceScaleFactor:2 });
    await p.goto('file://' + require('path').resolve(f));
    await p.waitForTimeout(400); // let webfonts settle
    const el = await p.$('.creative');
    await el.screenshot({ path: f.replace('.html','.png') });
    await p.close();
  }
  await b.close();
})();
```
> Always give webfonts a moment to load before capturing, or text may render in a fallback font.

---

## Recommended sizes per platform

| Platform / placement | Use these files |
|---|---|
| Instagram / Facebook **feed** | `*-1080x1080.html` (square) |
| Instagram / Facebook **Stories & Reels**, TikTok | `*-1080x1920.html` |
| **Facebook/Instagram link ads**, LinkedIn single-image | `*-1200x628.html` |
| LinkedIn feed square | `*-1080x1080.html` |
| Google Display (responsive) | export 1200×628 + 1080×1080 and let the network crop |

Square 1080×1080 is the safest all-rounder if you only export one per concept. Stories/Reels need the 1080×1920 verticals. 1200×628 is for click-through/link ad placements.

---

## How to swap copy / colors / fonts

Everything is plain HTML + inline `<style>`. No build step.

**Copy** — edit the text inside the obvious tags: `<h1>` (headline), `.sub` (subhead), `.cta` (button), `.price`. Keyword chips are individual `.chip` elements. Keep headlines short so they stay legible at thumbnail size.

**Colors** — find/replace these brand hex values in any file:
| Token | Hex |
|---|---|
| Indigo (primary) | `#4f46e5` |
| Violet (accent) | `#6366f1` |
| Success green | `#10b981` |
| Near-black bg | `#0b0b14` |
| Light slate bg | `#f8fafc` |
| Alert red (rejected) | `#ef4444` |
CTAs use `linear-gradient(135deg,#6366f1,#4f46e5)` — change both stops to re-tone.

**Fonts** — the `<link>` loads **Plus Jakarta Sans** (UI/body) + **Space Grotesk** (numerals/labels). To switch (e.g. to Sora), change the Google Fonts `<link>` href and update the `font-family` declarations. Keep a numeric/display face for the big score and stopwatch digits.

**Price** — global creatives show `$9`, Brazil shows `R$39`. Update the `.price .big` value and the `.lbl` line if you change the offer.

**The score gauge (38%→91%)** — in the match-score files, the visible number lives in `.score`; the conic-gradient `.ring` and `.needle` rotation are tuned to read as ~91%. If you change the displayed score, also adjust the `.ring` `conic-gradient` stop and the `.needle` `rotate()` so the dial matches.

---

## Claims / compliance notes

- **38% → 91%** is an **illustrative sample match score**, not a measured or guaranteed result. Treat it as a demo of the product's before/after behavior.
- No fabricated guarantees (e.g. "hired in X days"), no fake review counts, and no testimonials appear on any creative — by design. Keep it that way when editing.
- ATS / "Gupy" references describe how automated screening works in general; they are not endorsements by or affiliations with those platforms.
