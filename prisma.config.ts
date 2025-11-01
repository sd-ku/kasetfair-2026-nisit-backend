// prisma.config.ts  (CJS-friendly ไม่มี import.meta)
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { defineConfig, env } from "prisma/config";

// เลือก .env: ใช้ prisma/.env ถ้ามี ไม่งั้นใช้ ./.env
const rootEnv = resolve(process.cwd(), ".env");
const prismaEnv = resolve(process.cwd(), "prisma/.env");
const envFile = existsSync(prismaEnv) ? prismaEnv : rootEnv;

loadEnv({ path: envFile });

// ไม่ต้องใช้ __dirname/import.meta อีกต่อไป
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
