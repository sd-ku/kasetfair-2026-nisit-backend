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

# Copy node_modules (includes generated Prisma Client)
COPY --from=deps /app/node_modules ./node_modules

# Copy prisma folder (required by migrations & some runtime tools)
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/prisma.config.ts ./prisma.config.ts

COPY --from=build /app/dist ./dist
COPY package*.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]