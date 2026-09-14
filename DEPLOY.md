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
| chave | obrigatória | de onde |
|---|---|---|
| `AUTH_SECRET` | sim | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | sim (IA) | console.anthropic.com → API keys. **Precisa de crédito** — sem ela o app roda, mas geração e voz respondem "IA não configurada". |
| `NEXT_PUBLIC_BASE_URL` | sim | `https://seu-dominio.com` (usado nos retornos do checkout e nos webhooks) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | sim | sua conta admin (criada no primeiro boot) |
| `MP_ACCESS_TOKEN` | Brasil | Mercado Pago → Suas integrações → credenciais de **produção** |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | global | Stripe → Developers → API keys / Webhooks |

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
- **Mercado Pago**: Suas integrações → Webhooks → URL `https://seu-dominio.com/api/webhooks/mercadopago`, evento *Pagamentos*.
- **Stripe**: Webhooks → endpoint `https://seu-dominio.com/api/webhooks/stripe`, evento `checkout.session.completed`. Copie o *signing secret* para `STRIPE_WEBHOOK_SECRET`.
- Fallback: a página `/success` também confirma o pagamento direto no Stripe se o webhook atrasar; no MP ela espera o webhook.

## 7. Operar
```bash
docker compose pull && docker compose up -d --build   # atualizar
cp data/resumetailor.db backups/$(date +%F).db         # backup (faça um cron diário)
docker compose logs --tail 200 app                      # logs
```
Painel admin: `https://seu-dominio.com/admin` com `ADMIN_EMAIL`.

## Custos por kit
Com `AI_MODEL_KIT=claude-sonnet-5` cada kit custa ~US$0,02–0,05 em IA. Trocar para `claude-opus-5`
fica ~5x isso e melhora o texto; o preço de venda (US$9 / R$39) cobre qualquer um dos dois.
