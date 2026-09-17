#!/bin/sh
# The e2e server: a PRODUCTION build + `next start` (far less memory than `next dev`, and closer to
# what runs on the VPS). AI mocked, Mercado Pago payments read from files the tests write, and a
# throwaway database in data/e2e. E2E_SKIP_BUILD=1 reuses the previous build.
set -e
cd "$(dirname "$0")/.."
export NODE_OPTIONS="--max-old-space-size=3072"
PORT=3100
# Hermetic: next also reads .env/.env.local, but variables already set in the process (even empty)
# win. No real key reaches the tests.
export ANTHROPIC_API_KEY="" STRIPE_SECRET_KEY="" STRIPE_WEBHOOK_SECRET="" TAVILY_API_KEY="" ELEVENLABS_API_KEY="" ELEVENLABS_VOICE_ID="" OPENAI_API_KEY=""
export SUPPORT_EMAIL="" SUPPORT_WHATSAPP="" NEXT_PUBLIC_SUPPORT_EMAIL="" NEXT_PUBLIC_SUPPORT_WHATSAPP=""
# A production server offers checkout only with the seller identified: fictional test values.
export LEGAL_NAME="Operador de Teste E2E" LEGAL_DOCUMENT="000.000.000-00" LEGAL_ADDRESS="Rua de Teste, 1 — São Paulo, SP" LEGAL_EMAIL="legal@example.com"
export AUTH_SECRET="e2e-only-secret-not-used-anywhere-else-0000"
export NEXT_PUBLIC_BASE_URL="http://localhost:$PORT"
if [ "${E2E_SKIP_BUILD:-0}" != "1" ]; then
  BUILD_DATA="$(mktemp -d)"
  DATA_DIR="$BUILD_DATA" npx next build
  rm -rf "$BUILD_DATA"
fi
# Wiped here, before the server opens it (a wipe in globalSetup would orphan the open file).
rm -rf "$PWD/data/e2e"
mkdir -p "$PWD/data/e2e/mp"
export AI_MOCK=1
export E2E_TEST_MODE=1
export DATA_DIR="$PWD/data/e2e"
export MP_ACCESS_TOKEN="TEST-e2e-fake-token"
export MP_API_MOCK_DIR="$PWD/data/e2e/mp"
export ADMIN_EMAIL="admin@resumetailor.app" ADMIN_PASSWORD="resumetailor2026"
export FIT_CHECKS_PER_DAY=3
# The suite runs in a headless browser: let analytics count it (crawlers are still dropped).
export ANALYTICS_ALLOW_HEADLESS=1
# Every test browser shares one IP here: the per-IP analytics caps (unit-tested) would cut the suite short.
export RL_ANALYTICS_IP_HOUR=100000 RL_ANALYTICS_NEW_VISITOR_IP_DAY=100000
# Job links are served from fixtures, never fetched.
export JOB_IMPORT_MOCK=1
# One international language per kit on the test server, so the cap is reachable (default 2).
export KIT_INTL_MAX=1
export AI_PROBE_RETRY_SECONDS=8
exec npx next start -p "$PORT"
