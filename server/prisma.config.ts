import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Read directly (not with Prisma's env() helper, which throws when the variable is missing)
  // so `prisma generate` works on a fresh clone before a .env file exists.
  datasource: { url: process.env.DATABASE_URL },
});
