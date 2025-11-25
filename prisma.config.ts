import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

const databaseUrl = process.env.DATABASE_URL ?? env("DATABASE_URL");

export default defineConfig({
  // where the models are stored
  schema: "./prisma/schema.prisma",

  datasource: {
    url: databaseUrl,
  },

  migrations: {
    path: "./prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
});
