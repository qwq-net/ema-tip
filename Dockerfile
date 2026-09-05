# pnpm のバージョンは package.json の packageManager と一致させる。
# corepack は Node 25 以降同梱されないため npm で導入する
ARG PNPM_VERSION=11.25.0

FROM node:24-alpine AS deps
ARG PNPM_VERSION
WORKDIR /app
RUN npm install -g pnpm@${PNPM_VERSION}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

FROM node:24-alpine AS builder
ARG PNPM_VERSION
WORKDIR /app
RUN npm install -g pnpm@${PNPM_VERSION}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# バリデーション通過用のビルド時ダミー値。実行時は docker-compose の environment で上書きする
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ARG REDIS_URL=redis://localhost:6379
ENV DATABASE_URL=$DATABASE_URL
ENV REDIS_URL=$REDIS_URL
ENV CI=true
RUN pnpm build

FROM node:24-alpine AS runner
ARG PNPM_VERSION
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@${PNPM_VERSION}
# 本番は非 root で動かす。.next/cache へ画像最適化が書き込むため所有者を揃える
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --chown=node:node --from=builder /app/next.config.ts ./next.config.ts
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/.next ./.next
COPY --chown=node:node --from=builder /app/tsconfig.json ./tsconfig.json
COPY --chown=node:node --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --chown=node:node --from=builder /app/src ./src
USER node
EXPOSE 3000
CMD ["pnpm", "start"]
