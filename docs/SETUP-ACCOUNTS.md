# Accounts, Credits & Brazilian Checkout — Setup

This enables login, credit-based tiers, the cloud CV dashboard, and Mercado Pago
(Pix/boleto/card) for Brazil. Until you complete it, the app runs in **local MVP
mode** (no login; CVs + paid status live in the browser).

## 1. Supabase (auth + database) — ~10 min
1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the contents of [`supabase/schema.sql`](../supabase/schema.sql) → Run.
   (Creates `profiles`, `cvs`, `payments`, RLS policies, and a trigger that gives
   each new user **1 free credit**.)
3. **Project Settings → API**, copy into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep secret — server only)
4. **Authentication → Providers**: enable **Email** (magic link) and **Google**
   (add OAuth credentials + redirect `https://YOUR_DOMAIN` and `http://localhost:3000`).

## 2. Mercado Pago (Brazil) — ~10 min
1. Create an app at [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers).
2. Copy the **Access Token** → `.env.local` → `MP_ACCESS_TOKEN`.
3. Add a webhook pointing to `https://YOUR_DOMAIN/api/webhooks/mercadopago`;
   put the secret in `MP_WEBHOOK_SECRET`.
   - Pix, boleto and card are enabled automatically on Checkout Pro.

## 3. Credit model (no subscription)
- **Free:** unlimited match-score previews + company insights.
- **1 credit = 1 full kit unlock** (resume + cover letter + LinkedIn + interview prep + all PDF templates).
- Packs (one-time, never expire): **1 / 5 / 15** credits — see `/pricing`.
- Credits are granted **server-side by the webhook** and spent **server-side** on
  unlock (the service-role key bypasses RLS — the client can never mint credits).

## What's already built vs. next
**Built (this phase):** Supabase clients (env-guarded), DB schema, auth provider +
login UI, `/pricing` with packs, Mercado Pago checkout endpoint.

**Next (once your Supabase + MP are live, so it can be tested end-to-end):**
- `/api/webhooks/mercadopago` → verify payment, add credits, write `payments` row.
- Server-side credit **spend** on unlock + gating the kit/PDF behind it.
- Migrate the CV dashboard from localStorage to the `cvs` table (cross-device + versions).
- Stripe credit packs (global) to match Mercado Pago.
