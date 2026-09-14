# ResumeTailor — Ad Creatives

Six self-contained, static ad-creative templates. Each file is one creative at exact pixel
dimensions, designed to be opened in a browser and exported to PNG. Inline CSS only; the only
external resource is Google Fonts (Plus Jakarta Sans) via a `<link>`.

Open `index.html` for a thumbnail gallery of all six.

## Files & sizes

| File | Size | Angle |
|------|------|-------|
| `square-1080-matchscore.html` | 1080 × 1080 | Hero: 38% → 91% match score |
| `story-1080x1920-jobseeker.html` | 1080 × 1920 | Vertical story, big match gauge + CTA |
| `landscape-1200x628-vs-chatgpt.html` | 1200 × 628 | ChatGPT vs ResumeTailor comparison |
| `square-1080-firstjob.html` | 1080 × 1080 | First job / no experience |
| `story-1080x1920-careerchange.html` | 1080 × 1920 | Career change |
| `square-1080-physical-digital.html` | 1080 × 1080 | ATS version + in-person version |

---

## Exporting to PNG

### Option A — Browser screenshot (most reliable, pixel-exact)

1. Open the HTML file in Chrome.
2. Open DevTools (`Cmd/Ctrl + Shift + I`).
3. Open the Command Menu (`Cmd/Ctrl + Shift + P`) and run **"Capture node screenshot"**.
4. In the Elements panel, hover/select the root `<div class="creative">` element first, then run the
   command — it captures exactly that element at its native resolution (e.g. 1080×1080), with no
   browser chrome or scrollbars.

The `.creative` container has the exact width/height set, so the screenshot is the true ad size.

### Option B — Headless Chrome (one-liner)

Captures the full page at the exact creative size. Set `--window-size` to match the file:

```bash
# square 1080x1080
chrome --headless --screenshot=square-1080-matchscore.png \
  --window-size=1080,1080 --hide-scrollbars --force-device-scale-factor=1 \
  "file://$PWD/square-1080-matchscore.html"

# story 1080x1920
chrome --headless --screenshot=story-1080x1920-jobseeker.png \
  --window-size=1080,1920 --hide-scrollbars --force-device-scale-factor=1 \
  "file://$PWD/story-1080x1920-jobseeker.html"

# landscape 1200x628
chrome --headless --screenshot=landscape-1200x628-vs-chatgpt.png \
  --window-size=1200,628 --hide-scrollbars --force-device-scale-factor=1 \
  "file://$PWD/landscape-1200x628-vs-chatgpt.html"
```

> On macOS, `chrome` is usually
> `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
> For 2× retina exports, drop `--force-device-scale-factor=1` and add
> `--force-device-scale-factor=2` (output will be e.g. 2160×2160).

### Option C — Puppeteer (best for batch + exact element clipping)

```js
// node export.js  (npm i puppeteer)
const puppeteer = require('puppeteer');
const files = [
  ['square-1080-matchscore.html', 1080, 1080],
  ['story-1080x1920-jobseeker.html', 1080, 1920],
  ['landscape-1200x628-vs-chatgpt.html', 1200, 628],
  ['square-1080-firstjob.html', 1080, 1080],
  ['story-1080x1920-careerchange.html', 1080, 1920],
  ['square-1080-physical-digital.html', 1080, 1080],
];
(async () => {
  const browser = await puppeteer.launch();
  for (const [file, w, h] of files) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 }); // 2 = retina
    await page.goto('file://' + __dirname + '/' + file, { waitUntil: 'networkidle0' });
    const el = await page.$('.creative');
    await el.screenshot({ path: file.replace('.html', '.png') });
    await page.close();
  }
  await browser.close();
})();
```

---

## Recommended platform sizes

| Size | Platforms / placements |
|------|------------------------|
| **1080 × 1080** (square) | Instagram feed, Facebook feed, LinkedIn feed, X/Twitter |
| **1080 × 1920** (story 9:16) | Instagram Stories/Reels, TikTok, Facebook Stories, YouTube Shorts |
| **1200 × 628** (landscape ~1.91:1) | Facebook/Instagram link ads, LinkedIn link posts, X cards, Open Graph |

Other common sizes you can adapt by changing the `.creative` width/height: 1080×1350 (IG portrait 4:5),
1200×1200 / 1200×630 (OG), 1080×566 (X landscape).

---

## Swapping copy & colors

**Copy:** All text is plain HTML inside each file — edit it directly. Key hooks:
- Headlines live in `<h1>` (and the `<span class="eyebrow">` above them).
- The CTA button text is in `<div class="cta">` / `<a class="cta">`.
- The sample match score (`38%` / `91%`) appears as visible text and, for bars/gauges, as a width or
  `conic-gradient` percentage — update both the number and the matching percentage so the visual stays in sync.

**Colors:** The brand palette is used inline throughout. Find-and-replace these hex values per file:

| Token | Hex |
|-------|-----|
| Indigo (primary) | `#4f46e5` |
| Indigo (light) | `#6366f1` |
| Success green | `#10b981` (light `#34d399`, on dark `#6ee7b7`) |
| Near-black text | `#0f172a` |
| Light slate bg | `#f8fafc` (and `#eef2ff`) |

**Font:** Swap the Google Fonts `<link>` and the `font-family` declaration (currently
`'Plus Jakarta Sans'`) — `Inter` is a drop-in alternative.

---

## Notes / guardrails

- The `38% → 91%` match score is **illustrative** of the feature (a sample score), not a promise.
- No fabricated guarantees, review counts, or testimonials are used on any creative.
- Files are fully self-contained — no build step, no bundler, no local assets required.
