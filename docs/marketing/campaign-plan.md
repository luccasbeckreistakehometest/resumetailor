# ResumeTailor — Paid Acquisition Plan

> One-time **$9 USD / R$39 BRL** per tailoring. No subscription. No tiers. On-demand.
> Core promise: paste a job description + your resume → in ~30s get a tailored resume, matching cover letter, and LinkedIn "About" — with a **quantified Match Score**, ATS-safe formatting, and TWO finished formats (digital/ATS + designed PDF).

---

## 1. Positioning & Core Message

**The wedge:** "Anyone can paste a PDF into ChatGPT. You get generic text, bad formatting, and no idea if it's actually good."

ResumeTailor sells the three things ChatGPT can't give a job seeker:

1. **Expertise baked in** — recruiter/ATS know-how, keyword gap analysis, ATS-safe layout. No prompt skills required.
2. **A finished result** — two ready-to-use formats (one ATS/digital for online portals, one designed PDF to print/hand over), not a wall of text to clean up.
3. **Proof** — the **Match Score** before/after (e.g. "matched 38% of this job's keywords → now 91%") so you *see* the improvement instead of guessing.

**Master one-liner (use across channels):**
EN — "Stop guessing if your resume is good enough. See your Match Score, fix the gaps, and walk away with a tailored resume, cover letter, and LinkedIn — in 30 seconds. $9, no subscription."
pt-BR — "Pare de adivinhar se o seu currículo está bom. Veja seu Match Score, corrija o que falta e saia com currículo, carta de apresentação e LinkedIn prontos — em 30 segundos. R$39, sem assinatura."
ES — "Deja de adivinar si tu CV es lo bastante bueno. Mira tu Match Score, corrige lo que falta y llévate CV, carta de presentación y LinkedIn listos — en 30 segundos. Sin suscripción."

**Honesty guardrails (apply to ALL copy):**
- No "get hired in X days," no guaranteed-interview / guaranteed-job claims.
- No invented statistics. The Match Score is a real product output describing *the user's own document vs. the job's keywords* — frame it as a tool output ("see your match score"), never as a hiring-outcome promise.
- Defensible verbs: *tailor, optimize, match, highlight, format, see, improve, build* — not *guarantee, ensure, land, win.*
- Time/price claims ("~30 seconds," "$9") must stay accurate to the live product.

---

## 2. Audience Segments & Message Angle

| # | Segment | Pain | Angle / Hook | Primary proof point |
|---|---------|------|--------------|---------------------|
| A | **Active job seekers** (applying to many roles) | Sending the same generic resume everywhere, no responses | "One resume for every job is why you're getting ghosted. Tailor it to *this* posting in 30s." | Match Score before/after + per-job keyword gap |
| B | **Career changers** | Resume tells the old story; doesn't map to the new field | "Your experience translates — your resume just doesn't say it yet." | Keyword gap analysis reframes existing experience to the target role |
| C | **New grads / first job / no experience** | "I've never worked — what do I even put?" | "No resume? No experience? Build your first real CV in minutes." | The build-from-nothing flow; ATS-safe + designed PDF to hand in |
| D | **Recently laid off** | Urgency, anxiety, rusty resume | "Back on the market fast. Get a job-ready resume today, $9, no subscription." | Speed (~30s) + finished, polished output, no monthly trap |
| E | **"Just use ChatGPT" skeptics** (cross-cutting) | Already tried AI, got mediocre output | "ChatGPT gives you text. We give you a finished, ATS-safe resume *and* a score that proves it's better." | Two formats + Match Score + expertise |

> Segments A and E are the volume drivers and should get the most budget. C scales cheaply on TikTok (students). D is high-intent, low-volume, best on Search.

---

## 3. Funnel Mapping

```
            ┌──────────── COLD AD ────────────┐
            │ Meta / TikTok (interrupt)        │   Google Search (intent)
            │ angle by segment                 │   high-intent keyword
            └──────────────┬───────────────────┘
                           ▼
          ┌──────────── LANDING / QUIZ ────────────┐
          │  Quiz variant (Meta/TikTok cold):       │
          │  "What's your situation?" →             │
          │   [Applying now] [Changing careers]     │
          │   [First job / no resume] [Laid off]    │
          │  → personalizes headline + example      │
          │                                         │
          │  Direct LP (Google intent): paste box   │
          │  above the fold, no quiz friction       │
          └──────────────────┬──────────────────────┘
                             ▼
          ┌──────── PASTE JD + RESUME (or "no resume") ───────┐
          │  Frictionless input. For "no resume": guided form  │
          └──────────────────┬─────────────────────────────────┘
                             ▼
          ┌──────── MATCH-SCORE PREVIEW (the hook) ───────┐
          │  Show CURRENT score + top missing keywords     │
          │  FREE. Blur/lock the rewritten doc + new score │
          │  CTA: "Unlock your tailored resume — $9"       │
          └──────────────────┬─────────────────────────────┘
                             ▼
          ┌──────────── $9 / R$39 PAYWALL ────────────┐
          │  One-time. Apple/Google Pay + card + Pix(BR)│
          │  Deliver: ATS/digital + designed PDF +      │
          │  cover letter + LinkedIn About              │
          └─────────────────────────────────────────────┘
```

**Why this works:** the free Match-Score preview is the conversion engine. The user invests effort (pastes their real resume), sees a concrete, personalized gap ("you're missing: SQL, stakeholder management, A/B testing"), and the $9 to *close that gap* feels obvious. This is the on-page equivalent of the "proof" pillar.

**Tracking events (name consistently across pixel/GA4):**
`lp_view → quiz_complete → input_submit → score_preview_view → checkout_start → purchase`
Optimize Meta/TikTok toward `score_preview_view` early (cheap, high-volume signal), then shift to `purchase` once you have ~30–50 conversions/week per ad set for the algorithm to learn.

---

## 4. Budget Split (small starting budget)

Designed for a **lean test budget** (example: **$1,500 USD / month** total, ~$50/day). Scale the percentages, not the structure.

| Channel | % | $/mo (ex. $1,500) | Role in mix | Optimize for |
|---------|---|-------------------|-------------|--------------|
| **Google Search** | 35% | $525 | Harvest existing intent — highest CVR, lowest-risk first dollar | Conversions (purchase) |
| **Meta (IG + FB)** | 40% | $600 | Demand creation + scale; best targeting for segments A/B/D | Score-preview → purchase |
| **TikTok** | 25% | $375 | Cheapest reach, wins segment C (students/new grads), UGC virality | Score-preview view, then purchase |

**Allocation principles**
- **Start narrow:** 1 campaign per channel, 2–3 ad sets max. Don't fragment a small budget across 10 ad sets — none will exit learning.
- **Geo/language split inside each channel:** run EN (international), pt-BR (Brazil), ES (LATAM) as separate ad sets/campaigns so budget and CPA targets don't blend across very different CPMs. BR/LATAM CPMs are far lower than US/UK — expect cheaper clicks but also lower price point (R$39 ≈ ~$7–8), so watch ROAS per market separately.
- **Don't run TikTok in markets where you can't supply native-language UGC.** Worse to run bad localized video than to skip the geo.
- **Reserve ~10–15%** of Meta budget for retargeting (`score_preview_view` but not `purchase`) once you have traffic — this is the cheapest conversion you'll buy.

---

## 5. KPIs / Targets & Category Benchmarks

> Benchmarks below are **planning ranges** for a low-ticket, impulse-priced ($9) self-serve web tool — not guarantees. Treat them as "are we in the right ballpark," then replace with your own data after week 2. BR/LATAM typically show lower CPC/CPM and lower AOV than US/EN; judge each market on ROAS, not raw CAC.

| Metric | Google Search | Meta | TikTok | Notes |
|--------|---------------|------|--------|-------|
| **CTR** | 4–8% (search) | 0.9–1.8% | 0.8–1.5% | Search CTR naturally higher (intent). |
| **CPC** | $0.40–$1.50 (EN) / lower in BR-LATAM | $0.30–$1.20 | $0.20–$0.80 | EN/US top of range; BR/LATAM bottom. |
| **LP→score-preview** | 35–55% | 25–45% | 20–35% | Quiz can lift this if relevance is high. |
| **Preview→purchase (CVR)** | 8–18% | 5–12% | 3–8% | This is the money metric. Search converts best. |
| **Overall visitor→purchase** | 3–7% | 1.5–4% | 1–3% | |
| **CAC target** | < $9 in EN ideally; tolerate higher on first-touch | same | same | Single product = revenue $9 (≈$7–8 BR after FX). |
| **ROAS target** | ≥ 1.5–2.0x to scale | ≥ 1.3x acceptable on cold, blended ≥ 1.5x | ≥ 1.2x acceptable (it feeds retargeting) | At $9 AOV, profitable scaling needs tight CAC + retargeting + (later) referrals/repeat. |

**Reality check on a $9 product:** with no subscription, one-touch CAC must be very low or near break-even on cold traffic. The levers that make it work:
1. **Retargeting** the free-preview abandoners (cheap, high CVR).
2. **Repeat usage** — job seekers tailor *many* applications; a happy user buys again. Capture email at preview.
3. **Referral / "tailor a friend's"** prompt post-purchase.
4. **Market arbitrage** — BR/LATAM cheap CPMs can hit profitable CAC even at R$39.

**North-star to watch weekly:** blended **ROAS** and **CAC vs. $9**, segmented by market.

---

## 6. Campaign Naming Convention

Format:
```
[Channel]_[Market]_[Funnel]_[Audience]_[Angle]_[Date]
```
Levels:
- **Campaign:** `Channel_Market_Funnel` → `Meta_EN_Cold`, `Google_BR_Search`, `TikTok_ES_Cold`, `Meta_EN_Retargeting`
- **Ad set / Ad group:** `Audience_Angle` → `ActiveSeeker_MatchScore`, `NewGrad_FirstCV`, `LaidOff_FastFinished`
- **Ad / creative:** `Format_Hook_vN` → `Video_ChatGPTvsUs_v1`, `Static_BeforeAfterScore_v2`, `RSA_HighIntent_v1`

Examples:
- `Meta_EN_Cold_ActiveSeeker_MatchScore_Video_Ghosted_v1`
- `Google_BR_Search_HighIntent_RSA_v1`
- `TikTok_ES_Cold_NewGrad_FirstCV_Video_NoExperience_v2`

Keep market codes consistent: `EN` (international), `BR` (pt-BR), `ES` (LATAM Spanish).

---

## 7. Seven-Day Launch Sequence

**Pre-launch (Day 0 — do before spending):**
- Install Meta Pixel, TikTok Pixel, Google tag + GA4. Verify all 6 funnel events fire (`lp_view`→`purchase`).
- Set up Conversions API / server-side events (iOS signal loss makes this critical at $9 margins).
- Confirm checkout works in all 3 markets incl. Pix (BR) + Apple/Google Pay.
- Build 3 landing variants: quiz LP, direct paste LP, and a "no resume / first job" LP.
- Load creative: 12 Meta variants, 4 RSAs, 6+ TikTok videos (per language as available).

| Day | Focus | Actions |
|-----|-------|---------|
| **1** | **Google Search live first** | Launch `Google_[EN/BR/ES]_Search` on high-intent exact/phrase keywords only. Low risk, fastest learnings, immediate purchase signal. Budget ~40% of daily to Google on day 1. |
| **2** | **Meta cold live** | Launch `Meta_EN_Cold` + `Meta_BR_Cold` with 2 ad sets each (ActiveSeeker_MatchScore, JustUseChatGPT). Broad-ish targeting, let the algorithm find seekers. Optimize for `score_preview_view`. |
| **3** | **TikTok cold + ES expansion** | Launch `TikTok_[EN/BR/ES]_Cold` with NewGrad + ChatGPT-vs-Us hooks. Add `Meta_ES_Cold`. Keep Google running. |
| **4** | **First read + prune** | Pause any ad with CTR < half the channel benchmark AND zero `score_preview_view`. Don't touch winners. Add Search negative keywords from the search-terms report (free, school assignments, salaries). |
| **5** | **Stand up retargeting** | Now there's audience volume: launch `Meta_EN_Retargeting` + `Meta_BR_Retargeting` to `score_preview_view`-not-`purchase` (1-day & 7-day windows). Lowest CAC of the whole plan. |
| **6** | **Scale signal, kill losers** | Shift budget toward the best market×angle combos by ROAS. Duplicate top Meta ad set with +20% budget (avoid resetting learning by editing live winners). Refresh 1–2 fatiguing creatives. |
| **7** | **Review & set the cadence** | Full-week readout: CTR/CPC/CVR/CAC/ROAS by channel×market. Decide scale vs. fix. Lock weekly ritual: Mon prune + negatives, Wed creative refresh, Fri budget reallocation by ROAS. Plan next batch of creative around the winning angle. |

**Decision rules during the week**
- Give each ad set ~3 days / ~$30–50 before judging (don't kill on day 1 noise).
- If a market's CAC is 2x the $9 ticket after 50+ preview events with no path to retargeting recovery, pause that market and reallocate.
- Always keep ≥1 control variant per channel so a refresh doesn't blind you.

---

## 8. Strongest Angle per Channel (summary)

- **Meta:** the **before/after Match Score** ("38% → 91%") as a visual — it's a scroll-stopping, concrete proof of value that no competitor messaging can match.
- **Google Search:** **high-intent harvest** — meet "tailor resume to job description / ATS resume / resume for job application" with the literal finished product; this is where the $9 impulse closes best.
- **TikTok:** **"ChatGPT gives you text, this gives you a finished resume + a score"** UGC demo — native, screen-recorded, speaks to the audience that already tried AI and the new grads who live on the platform.
