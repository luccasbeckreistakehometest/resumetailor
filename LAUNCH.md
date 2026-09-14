# ResumeTailor — 24h Launch Playbook

A no-DB micro-app: paste job + resume → AI tailors both → pay $9 → download.
Margin is ~100% (only cost is a few cents of OpenAI per generation).

---

## 1. Get it running locally (10 min)

```bash
cd ~/Documents/resume-tailor
cp .env.local.example .env.local   # already done
# edit .env.local and paste your real keys:
#   OPENAI_API_KEY  -> platform.openai.com/api-keys  (add ~$5 credit)
#   STRIPE_SECRET_KEY -> dashboard.stripe.com/test/apikeys (TEST key first)
npm run dev
# open http://localhost:3000
```

Test flow with Stripe **test** card: `4242 4242 4242 4242`, any future date, any CVC.

## 2. Go live to get paid (15 min)

1. **Stripe**: flip from TEST to LIVE keys (toggle in Stripe dashboard). Put the
   `sk_live_...` key in your deployment env. Complete Stripe's account activation
   (bank details) so payouts reach you.
2. **Deploy on Vercel**:
   ```bash
   npm i -g vercel
   vercel            # follow prompts
   vercel --prod
   ```
   In the Vercel project → Settings → Environment Variables, add:
   `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `PRICE_CENTS=900`.
3. You now have a public URL. Test the full flow once with a real card (refund
   yourself in Stripe after).

## 3. Get the first sale (the part that actually matters)

The product is built. **Distribution is the whole game now.** Two channels in parallel:

### Free / organic (do this first — can convert in hours)
Post a genuinely helpful message where job-seekers gather. Don't spam a link —
lead with value, mention the tool once.
- Reddit: r/resumes, r/jobs, r/jobsearch, r/cscareerquestions, r/GetEmployed
  (read each sub's self-promo rules first — some require a flair or only allow
  links in comments).
- LinkedIn: a short post — "I built a tool that rewrites your resume for a
  specific job in 30s. First 20 people, comment and I'll DM the link."
- Job-seeker Discords / Facebook groups / WhatsApp groups.
- X: post a 20-second screen recording of the flow.

Honest framing that converts: *"Tired of editing your resume for every
application? Paste the job + your resume, get a tailored version in 30 seconds.
Free preview, $9 to unlock."*

### Paid (use your budget once organic proves the offer converts)
- **Reddit Ads** or **X Ads** targeting job-search interests — cheapest to start.
- **Google Search Ads** on intent keywords: "tailor resume to job description",
  "resume for specific job", "ai cover letter generator". High intent = best ROI.
- Start with a small daily cap ($10–20). Watch cost-per-checkout. Scale only what
  is profitable. Day 1 with a cold ad account is usually break-even at best —
  organic is where the first dollar most likely comes from.

## 4. Quick wins if conversion is low
- Lower price to $7, or add urgency ("first 50 at $5").
- Add 2–3 fake-free real examples (before/after) to the landing page.
- Add testimonials as soon as you get one happy user.

---

## How the no-DB payment flow works
1. `/api/generate` calls OpenAI, returns full result to the browser.
2. Browser shows a blurred teaser and saves the full result in `localStorage`.
3. `/api/checkout` creates a Stripe Checkout session; user pays.
4. Stripe redirects to `/success?session_id=...`.
5. `/success` calls `/api/verify` to confirm `payment_status === "paid"`, then
   reveals the result from `localStorage`. Same browser required.

### Known trade-offs (fine for MVP, fix later if it scales)
- Full result lives client-side before payment → a technical user could read it
  from the network tab without paying. Acceptable at this volume.
- localStorage means the unlock only works in the same browser/device.
- No webhook/receipt emails yet. Add Stripe webhooks + email + a DB if you grow.
