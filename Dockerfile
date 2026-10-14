# Imagem de produção do FinTrack (Next.js com output "standalone").
#
#   docker build -t fintrack .
#   docker run -p 3000:3000 --env-file .env fintrack
#
# Variáveis lidas em tempo de execução: AUTH_SECRET, DATABASE_URL,
# DATABASE_AUTH_TOKEN e NEXTAUTH_URL (veja .env.example e docs/docker.md).

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=10.28.0

# ---------- Etapa 1: dependências + build ----------
FROM node:${NODE_VERSION} AS builder
ARG PNPM_VERSION
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copia só os manifestos primeiro para reaproveitar o cache do install.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# O build importa src/lib/db, que exige DATABASE_URL. Usamos um banco
# descartável só nesta etapa; o banco real é informado no "docker run".
RUN DATABASE_URL=file:/tmp/build.db pnpm build

# ---------- Etapa 2: runtime ----------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Usuário sem privilégios; /app/data guarda o SQLite local, se usado.
RUN addgroup -S -g 1001 nodejs \
    && adduser -S -u 1001 -G nodejs nextjs \
    && mkdir -p /app/data \
    && chown nextjs:nodejs /app/data

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
