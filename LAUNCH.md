# ResumeTailor — lançar

Veja **DEPLOY.md** (Hostinger VPS, Docker, HTTPS, webhooks). Este arquivo só lista o checklist.

- [ ] `.env` preenchido (AUTH_SECRET, ANTHROPIC_API_KEY com crédito, ADMIN_*, NEXT_PUBLIC_BASE_URL)
- [ ] Mercado Pago em **produção** + webhook cadastrado (Brasil)
- [ ] Stripe em **live** + webhook cadastrado (global)
- [ ] `docker compose up -d --build` → `/` abre, `/admin` loga
- [ ] Teste real: crie conta → gere um kit → primeiro crédito desbloqueia → `/print` gera PDF
- [ ] Teste real de compra (R$39 via Pix) → créditos aparecem no `/admin` → Pagamentos
- [ ] Backup diário do `data/resumetailor.db`

Local: `npm run dev` · testes: `npm test` (unit) e `npm run e2e` (Playwright, IA mockada).
