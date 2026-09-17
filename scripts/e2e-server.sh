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
export LEGAL_NAME="" LEGAL_DOCUMENT="" LEGAL_ADDRESS="" LEGAL_EMAIL=""
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
export AI_PROBE_RETRY_SECONDS=8
exec npx next start -p "$PORT"
