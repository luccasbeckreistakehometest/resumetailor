# ResumeTailor — Documento do Produto

> Fonte única de verdade do produto: o que é, o que queremos, o que já foi feito e o que falta.
> Última atualização: 2026-06.

---

## 1. O que é

Um web app que pega **uma vaga + o currículo do usuário** e devolve, em ~30 segundos, um
**kit completo de candidatura**: currículo reescrito sob medida pra aquela vaga, carta de
apresentação, "Sobre" do LinkedIn, **preparação de entrevista** e uma **nota de
compatibilidade (Match Score)** que prova que ficou melhor.

Funciona também pra quem **não tem currículo** (primeiro emprego) e pra quem só quer
**melhorar o CV sem uma vaga específica**.

**One-liner:** *"O ChatGPT te dá texto. A gente te dá um sistema de candidatura nível
recrutador — com nota de compatibilidade, os formatos certos pra robô e pra humano, e sem
você precisar saber prompt."*

---

## 2. Visão & objetivos (o que queremos do produto)

- **Ser a referência** pra qualquer pessoa, de qualquer nicho, que busca emprego/vaga.
- **Foco central: simplicidade + velocidade** — rápido de usar e de converter — **sem abrir
  mão** de uma gama de ferramentas profissionais. Isso deve ficar **claro pro cliente**.
- **Converter bem, mas com lucro sempre** (modelo de créditos, sem assinatura).
- **Multi-mercado**: Global (EN), LATAM (ES) e **Brasil (PT-BR)** — sendo o Brasil um nicho à
  parte que exige **copy própria**, não tradução.
- **Diferenciais reais** sobre o "genérico" (vs jogar PDF no ChatGPT).
- **Design inovador**, não genérico.

### Princípios inegociáveis (integridade)
- **Nunca** inventar estatística de resultado do produto. Só usamos **dados de mercado reais,
  com fonte e ano**.
- **Nunca** usar logos de marcas famosas (Google, VW...) fingindo endosso/parceria. Mostramos
  os **sistemas ATS** ("compatível, não afiliado").
- A IA **nunca** inventa experiência que o candidato não tem.

---

## 3. Público & mercados

| Mercado | Idioma | Moeda | Pagamento | Ângulo de copy |
|---|---|---|---|---|
| Global | EN | USD | Stripe | ATS internacional (Workday/Greenhouse), 7s, vs ChatGPT |
| LATAM | ES | USD | Stripe | "no es que no estés calificado: tu CV no coincide" |
| **Brasil** | **PT-BR** | **BRL** | **Mercado Pago** | **Gupy** ("seu CV morre na triagem da Gupy"), primeiro emprego, recolocação |

Públicos-alvo: candidatos ativos, quem está mudando de carreira, primeiro emprego / sem
experiência, e quem foi demitido.

---

## 4. Posicionamento & diferenciais (vs "só usar o ChatGPT")

1. **Match Score (antes → depois)** — ex: 38% → 91%, com os keywords da vaga acendendo.
   Prova visual que o ChatGPT não dá. **Aparece grátis no preview** (gatilho de conversão).
2. **Método de recrutador/ATS embutido** — extração de keywords, análise de lacunas, bullets
   quantificados, formatação ATS-safe. Sem precisar promptar.
3. **Dois usos, formatos prontos** — versão **ATS** (pra candidatura online) e **PDF desenhado**
   (pra imprimir / entregar na mão). 5 templates de design.
4. **Kit completo** — currículo + carta + Sobre do LinkedIn + **preparação de entrevista** (o
   que falar, o que enfatizar, prováveis perguntas técnicas/comportamentais).
5. **Insights da empresa** — quando há a vaga, busca na web sobre a empresa, tecnologias e
   processo seletivo (com fontes).
6. **Dashboard de CVs** — salvar, renomear, re-personalizar em segundos.
7. **Multi-idioma** com detecção por região + troca manual.

---

## 5. Modelo de negócio (preço)

- **Sem assinatura, sem tiers complicados.** Modelo de **créditos one-time** (não expiram).
- **Grátis:** prévia do Match Score + insights da empresa — **ilimitado**.
- **1 crédito = 1 kit completo desbloqueado** (currículo + carta + LinkedIn + entrevista + todos
  os templates de PDF).
- **Pacotes:** 1 / 5 / 15 créditos com preço unitário decrescente.
  - BR: R$39 / R$149 / R$349 (Mercado Pago — Pix/boleto/cartão)
  - Global: $9 / $35 / $75 (Stripe)
- Créditos são **concedidos e gastos no servidor** (o cliente nunca cria crédito).

---

## 6. Stack & arquitetura

- **Next.js 16** (App Router, Turbopack) · **React** · **TypeScript** · **Tailwind v4**
- **OpenAI** (`gpt-4o-mini`) — geração do kit e síntese dos insights
- **Stripe** — checkout global
- **Mercado Pago** — checkout Brasil (Pix/boleto/cartão)
- **Supabase** — auth (magic link + Google) + banco (perfis, CVs, pagamentos) — *fundação pronta, ligação final pendente*
- **Tavily** (opcional) — busca web pros insights da empresa
- **react-markdown** — renderização do CV nos templates de PDF
- **i18n** próprio (dicionários EN/PT/ES + Provider, sem lib externa)

Padrão importante: **tudo é guardado por variável de ambiente**. Sem as chaves, o app roda em
**modo local (MVP)** e nada quebra.

---

## 7. Mapa de rotas / páginas

| Rota | O que é |
|---|---|
| `/` | Landing principal (hero escuro com demo animado do Match Score, faixa ATS, provas, features, comparação, FAQ) |
| `/start` | **Funil quiz** (3 modos: ajustar pra vaga / melhorar / criar 1º CV) — pra tráfego de Instagram |
| `/pricing` | Pacotes de crédito (BRL/USD por idioma) |
| `/library` | **Dashboard de CVs** — ver/baixar, renomear, excluir |
| `/print` | **Estúdio de PDF** — 5 templates, export — **bloqueado por pagamento** |
| `/success` | Pós-pagamento — verifica, libera o kit, salva na biblioteca |
| `/lp/[slug]` | **Landing pages de anúncio** (jobseeker / firstjob / careerchange / vschatgpt) |
| `/api/generate` | Gera o kit (3 modos) + match score + entrevista |
| `/api/insights` | Insights da empresa (Tavily) |
| `/api/checkout` | Stripe |
| `/api/checkout/mercadopago` | Mercado Pago |
| `/api/verify` | Confirma pagamento Stripe |
| `/api/webhooks/mercadopago` | **(A FAZER)** credita após pagamento |

Componentes principais: `MatchScore`, `LiveMatchDemo`, `CompanyInsights`,
`LanguageSwitcher`, `SupportChat`, `AuthProvider`, `AuthButton`.

---

## 8. ✅ O que já foi feito

**Produto / app**
- [x] Geração do kit com IA (3 modos: tailor / improve / build-first-CV)
- [x] **Match Score** (antes→depois + keywords) grátis no preview — landing e quiz
- [x] Carta de apresentação + "Sobre" do LinkedIn
- [x] **Preparação de entrevista + o que enfatizar** (técnico, comportamental, perguntas a fazer)
- [x] **Insights da empresa** (web, com fontes) — via Tavily, opcional
- [x] **5 templates de design de CV** (ATS, Modern, Elegant, Compact, Bold) + export PDF
- [x] **Funil quiz** multi-passo (cobre quem não tem CV e quem não tem vaga)
- [x] **Multi-idioma EN/PT/ES** (detecção por região + troca manual)
- [x] **Dashboard de CVs** (localStorage) — ver/baixar/renomear/excluir
- [x] **Chat de suporte** flutuante (e-mail + WhatsApp configuráveis)
- [x] **Landing pages de anúncio** dedicadas `/lp/[slug]`
- [x] Paywall fechado: `/print` exige pagamento

**Design**
- [x] Hero escuro premium com **demo animado** do Match Score
- [x] Seções repaginadas (banda de provas escura, **bento de ferramentas**, comparação, etc.)
- [x] Responsivo
- [x] **Faixa de ATS honesta** (Workday/Greenhouse/Gupy/Lever/SAP... — "compatível, não afiliado")

**Pagamento / contas (fundação)**
- [x] Stripe (checkout global) + verificação + sucesso
- [x] **Mercado Pago** endpoint (Pix/boleto/cartão) + pacotes de crédito
- [x] **Supabase**: schema (perfis/CVs/pagamentos + RLS + 1 crédito grátis), clientes, **login** (magic link + Google)
- [x] **/pricing** com pacotes (sem assinatura)

**Marketing** (em `docs/marketing/` e `marketing/creatives*/`)
- [x] Plano de campanha (v1 + v2 loss-aversion "você está perdendo vagas")
- [x] Copy de anúncio EN/PT/ES (Meta/Google/TikTok)
- [x] **Dados reais 2025 com fonte** (`market-data-2026.md` + `proofStats.ts`): 62% Resume Now, 53% ResumeGo, 98% Fortune 500 ATS...
- [x] **11 criativos v2** com direção de arte (set Brasil/Gupy + set Global EN/ES) + galeria

---

## 9. ⏳ O que falta

### Trilha A — precisa das credenciais (Supabase + Mercado Pago no ar pra testar)
- [ ] `/api/webhooks/mercadopago` → verificar pagamento, **creditar** o usuário, gravar `payments`
- [ ] **Gasto de crédito no servidor** no momento do unlock (gating do kit/PDF)
- [ ] Migrar o dashboard de **localStorage → Supabase** (sincroniza entre dispositivos + histórico de versões)
- [ ] **Pacotes de crédito no Stripe** (global) iguais aos do Mercado Pago
- [ ] i18n da página `/success` (hoje em inglês)

### Trilha B — dá pra fazer sem credenciais
- [ ] **Ideias do Ladders** simplificadas: nota/score de currículo grátis (mesmo sem vaga), fluxo "1 clique", selo "candidate-se com confiança"
- [ ] **Copy BR mais profunda** (linguagem própria, não traduzida) em toda a jornada
- [ ] Mais **inovação de design** nas seções restantes
- [ ] Mensagem clara de **"simples e rápido, sem abrir mão das ferramentas pro"**
- [ ] **Depoimentos reais** (substituir os placeholders — hoje marcados como amostra)
- [ ] Exportar os criativos pra **PNG** (Playwright headless) prontos pra subir

---

## 10. Como rodar / setup

```bash
cd ~/Documents/resume-tailor
cp .env.local.example .env.local   # preencher as chaves
npm run dev                        # http://localhost:3000
```

**Chaves (todas opcionais — sem elas, roda em modo local):**
- `OPENAI_API_KEY` → geração do kit + insights (essencial pra IA funcionar)
- `STRIPE_SECRET_KEY` → checkout global
- `TAVILY_API_KEY` → insights da empresa (opcional)
- `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` → contas + créditos + dashboard na nuvem
- `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` → Mercado Pago (Brasil)
- `NEXT_PUBLIC_SUPPORT_EMAIL` / `NEXT_PUBLIC_SUPPORT_WHATSAPP` → chat de suporte

Guia detalhado de contas/pagamento: [`docs/SETUP-ACCOUNTS.md`](docs/SETUP-ACCOUNTS.md).
Banco: [`supabase/schema.sql`](supabase/schema.sql).

---

## 11. Limitações conhecidas (estado atual)

- **Modo local (MVP):** sem Supabase, CVs e o status "pago" ficam no **navegador** (por
  dispositivo) e o paywall é **client-side** (burlável por usuário técnico). Resolvido quando a
  Trilha A entrar (banco + gasto de crédito no servidor).
- **Comprar crédito ainda não credita** automaticamente — falta o webhook (Trilha A). Seguro:
  o checkout BR fica desativado enquanto não houver `MP_ACCESS_TOKEN`.
- **Depoimentos são placeholders** — trocar pelos reais antes de divulgar.
- Match Score e insights são **estimativas/baseados em fontes** — rotulados como tal na UI.
