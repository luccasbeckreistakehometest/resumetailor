# ResumeTailor — one container, SQLite on a mounted volume. Needs a VPS, not shared hosting.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Only what the build needs — never `COPY . .`, which would bake the server's .env into a layer.
COPY package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined at build time and they live in the server's .env (compose
# `build: ../resumetailor`). The context is bind-mounted for this step only; just the public
# lines are copied into .env.production, so secrets never reach a layer.
RUN --mount=type=bind,target=/ctx \
    if [ -f /ctx/.env ]; then grep -E '^NEXT_PUBLIC_[A-Z0-9_]+=' /ctx/.env > .env.production || true; fi && \
    npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 DATA_DIR=/app/data PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json next.config.* ./
RUN mkdir -p /app/data && chown -R node:node /app
USER node
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
