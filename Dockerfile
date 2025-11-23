# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

# ---- Dependencies (for build) ----
FROM base AS deps
COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prefer-offline

# Prisma needs DATABASE_URL at build time for client generation
ARG DATABASE_URL=postgresql://appuser:apppass@db:5432/appdb?schema=public
ENV DATABASE_URL=${DATABASE_URL}

COPY prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm prisma generate

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# ---- Production ----
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

# ใช้ node_modules จาก deps (ถ้าอยากผอมกว่านี้ค่อยปรับเป็น prod-only ทีหลัง)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/generated ./generated

COPY --from=build /app/dist ./dist
COPY package*.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]
