# ResumeTailor — lançar

Veja **DEPLOY.md** (Hostinger VPS, Docker, HTTPS, webhooks). Este arquivo só lista o checklist.

- [ ] `.env` preenchido (AUTH_SECRET, ANTHROPIC_API_KEY com crédito, ADMIN_*, NEXT_PUBLIC_BASE_URL)
- [ ] Mercado Pago em **produção** + webhook cadastrado (Brasil)
- [ ] Stripe em **live** + webhook cadastrado (global)
- [ ] `docker compose up -d --build` → `/` abre, `/admin` loga
- [ ] Teste real: crie conta → gere um kit → primeiro crédito desbloqueia → `/print` gera PDF
- [ ] Teste real de compra (R$39 via Pix) → créditos aparecem no `/admin` → Pagamentos
- [ ] Backup diário do `data/resumetailor.db`
- [ ] `.env` sem comentário na mesma linha; `ELEVENLABS_*`/`TAVILY_API_KEY` vazios se não houver chave; `NEXT_PUBLIC_SUPPORT_WHATSAPP` real ou vazio
- [ ] `LEGAL_*` preenchidos e textos de /legal revisados (são rascunho)
- [ ] `AI_DAILY_BUDGET_USD` definido; conferir /admin → IA "funcionando"
- [ ] Teste real de reembolso (MP) → créditos saem do saldo

Local: `npm run dev` · testes: `npm test` (unit) e `npm run e2e` (Playwright, IA mockada).
