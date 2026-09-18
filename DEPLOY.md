# ResumeTailor — subir na Hostinger (VPS)

O app precisa de **Node contínuo + disco persistente** (SQLite em `data/`, sessões, webhooks).
Na Hostinger isso é o produto **VPS** — não funciona em "Hospedagem de Sites" (shared) nem em
serverless. Tudo roda em Docker; do zero ao ar em ~20 minutos.

## 1. VPS
- hPanel → **VPS** → plano **KVM 1** (4 GB) ou maior. O build do Next precisa de ≥2 GB.
- Sistema: escolha o template **Ubuntu 24.04 com Docker**. Anote o IP.
- Aponte o DNS do seu domínio (registro A) para o IP.

## 2. Código no servidor
```bash
ssh root@SEU_IP
git clone https://SEU-REPO.git resumetailor && cd resumetailor
cp .env.example .env && nano .env      # preencha (abaixo)
```
Sem git: `rsync -av --exclude node_modules --exclude .next --exclude data ./ root@SEU_IP:/root/resumetailor/`

## 3. `.env` — o que cada chave faz
**Comentário sempre em linha própria.** O `env_file` do docker lê `CHAVE=   # comentário` como se o
comentário fosse o valor (foi assim que a voz e os insights ficaram "configurados" com lixo). O app
também trata qualquer valor começando com `#` como vazio, mas não conte com isso.

| chave | obrigatória | de onde |
|---|---|---|
| `AUTH_SECRET` | sim | `openssl rand -hex 32` (gerado no servidor; em produção o app recusa valor curto ou de exemplo) |
| `ANTHROPIC_API_KEY` | sim (IA) | console.anthropic.com → API keys. **Precisa de crédito.** O app testa a chave no boot (`GET /v1/models`) e mostra "IA fora do ar" em /start se ela for recusada. |
| `NEXT_PUBLIC_BASE_URL` | sim | `https://seu-dominio.com` — retornos do checkout, notificação do MP, OG/canonical. Entra no build (NEXT_PUBLIC). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | sim | conta admin; trocar `ADMIN_PASSWORD` e dar `up -d` ressincroniza a senha |
| `MP_ACCESS_TOKEN` | pagamentos | Mercado Pago → credenciais de **produção**. Com o Stripe desligado, todo idioma paga por aqui (em BRL, rotulado). |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | opcional | Stripe → API keys / Webhooks (cartão em USD) |
| `AI_DAILY_BUDGET_USD` | recomendado | teto diário de gasto de IA (padrão 25). Atingiu → IA e voz pausam até 00:00 UTC; aparece no /admin |
| `AI_ANON_DAILY_BUDGET_USD` | opcional | fatia do teto que visitantes sem conta podem gastar (padrão 20% do teto; negativo = sem fatia). Esgotou → só quem está logado segue usando IA até 00:00 UTC |
| `TAVILY_COST_PER_SEARCH_USD` | opcional | custo estimado por busca do Tavily, somado ao gasto dos insights (padrão 0.008) |
| `AI_CALL_ESTIMATE_USD` | opcional | quanto uma chamada de IA "reserva" do teto antes de rodar (padrão 0.05), acertado com o custo real quando ela volta. É o que impede um punhado de chamadas paralelas de passar juntas pelo teto. Dá pra afinar por recurso: `AI_ESTIMATE_GENERATE_USD`, `AI_ESTIMATE_FIT_USD`, … |
| `AI_FAILED_CALL_FLOOR_USD` | opcional | custo mínimo lançado quando a chamada falha (padrão 0.002): o provedor cobra os tokens de entrada mesmo assim |
| `TRUSTED_PROXY_HOPS` | opcional | quantos proxies entre o app e o visitante escrevem no `X-Forwarded-For` (padrão 0 — só o Caddy, que substitui o cabeçalho). Colocou uma CDN na frente e confiou nela no Caddy? Passe 1, senão todo visitante cai no mesmo balde de limite por IP |
| `ELEVENLABS_API_KEY` / `OPENAI_API_KEY` | opcional | voz da IA; vazio = só texto |
| `TAVILY_API_KEY` | opcional | insights da empresa; vazio = recurso e textos somem |
| `SUPPORT_EMAIL` / `SUPPORT_WHATSAPP` | opcional | só aparecem se preenchidos (lidos em tempo de execução, sem rebuild). O formulário de contato sempre funciona. |
| `LEGAL_NAME` / `LEGAL_DOCUMENT` / `LEGAL_ADDRESS` / `LEGAL_EMAIL` | **sim, pra vender** | nome, CPF/CNPJ, endereço e e-mail do responsável nas páginas legais (Decreto 7.962/2013 art. 2; LGPD art. 9). `LEGAL_EMAIL` vazio usa `SUPPORT_EMAIL`. **Sem os quatro, produção não oferece checkout** (botões somem, /admin avisa, log `[boot] checkout is OFF`). Webhooks e /success continuam processando pagamentos já feitos. |
| `ANON_PREVIEWS_PER_IP_PER_DAY`, `SIGNUP_BONUS_PER_IP_30D`, `RL_*` | opcional | limites de abuso (ver `lib/server/ratelimit.ts`) |

O Dockerfile não copia o `.env` pra imagem: ele monta o contexto só no passo de build e extrai as
linhas `NEXT_PUBLIC_*`. Mudou uma `NEXT_PUBLIC_*`? Precisa de `--build`.

## 4. Subir
```bash
docker compose up -d --build
docker compose logs -f app        # aguarde "Ready"
```
Acesse `http://SEU_IP:3000`. O banco nasce em `./data/resumetailor.db` (volume — sobrevive a rebuilds).

## 5. HTTPS (Caddy, 2 comandos)
```bash
apt install -y caddy
cat > /etc/caddy/Caddyfile <<'C'
seu-dominio.com {
  reverse_proxy localhost:3000
}
C
systemctl reload caddy
```
Caddy emite e renova o certificado sozinho.

## 6. Webhooks (créditos entram sozinhos)
- **Mercado Pago**: Suas integrações → Webhooks → URL `https://seu-dominio.com/api/webhooks/mercadopago`, evento *Pagamentos*. Falha ao consultar o pagamento → resposta 5xx (o MP tenta de novo). `refunded`/`charged_back` tiram os créditos; reembolso parcial (pagamento `approved` com `transaction_amount_refunded`) tira a parte proporcional e marca `partially_refunded`.
- **Stripe**: Webhooks → endpoint `https://seu-dominio.com/api/webhooks/stripe`, eventos `checkout.session.completed`, `charge.refunded` e `charge.dispute.created`. Copie o *signing secret* para `STRIPE_WEBHOOK_SECRET`.
- Fallback: a página `/success` confirma direto no provedor (sessão do Stripe ou `payment_id` do MP) e só mostra "pago" quando os créditos já estão na conta.

## 7. Operar
```bash
docker compose pull && docker compose up -d --build   # atualizar
cp data/resumetailor.db backups/$(date +%F).db         # backup (faça um cron diário)
docker compose logs --tail 200 app                      # logs
```
Painel admin: `https://seu-dominio.com/admin` com `ADMIN_EMAIL` — saúde da IA e gasto do dia,
busca de usuário (senha temporária, desativar, desconectar), tirar currículo público do ar e as
mensagens do formulário de contato. Saúde: `GET /api/health` → `{ok, db}`.

## Custos por kit
Com `AI_MODEL_KIT=claude-sonnet-5` cada kit custa ~US$0,02–0,05 em IA. Trocar para `claude-opus-5`
fica ~5x isso e melhora o texto; o preço de venda (US$9 / R$39) cobre qualquer um dos dois.
