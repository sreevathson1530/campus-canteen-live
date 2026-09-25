/**
 * Vercel build (package.json "vercel-build"): PostgreSQL client, migrations, seed, then next build.
 * Migrations and seeding use Neon's direct connection (DATABASE_URL_UNPOOLED); the app uses the pooled one.
 */
import { execSync } from "node:child_process";

const direct = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!direct) throw new Error("DATABASE_URL is not set: connect a Neon database to this Vercel project first");

const run = (cmd: string, env: Record<string, string> = {}) =>
  execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });

run("npx prisma generate --schema prisma/postgres/schema.prisma");
run("npx prisma migrate deploy --schema prisma/postgres/schema.prisma", { DATABASE_URL: direct });
run("npx tsx prisma/seed.ts", { DATABASE_URL: direct });
run("npx next build");
