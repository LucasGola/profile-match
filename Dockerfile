# --- builder: instala tudo, gera o client e compila ---
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig*.json ./
COPY src ./src
RUN npx prisma generate && npm run build

# --- runtime: só o necessário para rodar ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
# node_modules do builder já traz o Prisma CLI (migrate deploy) e engines.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Padrão: API. worker/migrate sobrescrevem o command no compose.
CMD ["node", "dist/api/index.js"]
