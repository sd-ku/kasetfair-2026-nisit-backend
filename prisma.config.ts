// prisma.config.ts  (CJS-friendly ไม่มี import.meta)
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// เลือก .env: ใช้ prisma/.env ถ้ามี ไม่งั้นใช้ ./.env
const rootEnv = resolve(process.cwd(), ".env");
const prismaEnv = resolve(process.cwd(), "prisma/.env");
const envFile = existsSync(prismaEnv) ? prismaEnv : rootEnv;

loadEnv({ path: envFile });

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // ใช้อันนี้จะ type-safe และให้ error ชัดถ้า DATABASE_URL ไม่มี
    url: env("DATABASE_URL"),
    // ถ้าไม่อยากใช้ env() จริงๆ จะใช้:
    // url: process.env.DATABASE_URL!,
    // ก็ได้ แต่ระวังลืม set ใน .env จะมองไม่ออกจนตอน runtime
  },
});
