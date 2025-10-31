# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Dependencies (faster layer caching) ----
FROM base AS deps
COPY package*.json ./
# ถ้าใช้ pnpm/yarn ก็เปลี่ยนตามจริง
RUN npm ci

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# ถ้าใช้ Prisma: RUN npx prisma generate
RUN npm run build

# ---- Production ----
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
