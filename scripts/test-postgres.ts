/**
 * Runs the integration tests against a real, throwaway PostgreSQL (the production database engine):
 *   npm run test:pg
 * Starts embedded Postgres, applies prisma/postgres migrations, runs Vitest, then restores the
 * SQLite Prisma client used for local development.
 */
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const PORT = 54329;
const DB = "canteen_test";
const url = `postgresql://postgres:postgres@127.0.0.1:${PORT}/${DB}`;
const dir = ".pg-test";

function run(cmd: string, args: string[], env: Record<string, string> = {}): number {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, env: { ...process.env, ...env } });
  return r.status ?? 1;
}

async function main() {
  rmSync(dir, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: "postgres", password: "postgres", port: PORT, persistent: false });
  let code = 1;
  try {
    await pg.initialise();
    await pg.start();
    await pg.createDatabase(DB);
    if (run("npx", ["prisma", "generate", "--schema", "prisma/postgres/schema.prisma"]) !== 0) throw new Error("generate failed");
    if (run("npx", ["prisma", "migrate", "deploy", "--schema", "prisma/postgres/schema.prisma"], { DATABASE_URL: url }) !== 0)
      throw new Error("migrate failed");
    code = run("npx", ["vitest", "run", "tests/integration"], { TEST_DATABASE_URL: url, NODE_ENV: "test" });
  } finally {
    await pg.stop().catch(() => undefined);
    rmSync(dir, { recursive: true, force: true });
    run("npx", ["prisma", "generate"]); // back to the SQLite client for local dev
  }
  process.exit(code);
}

main().catch((e) => {
  console.error(e);
  run("npx", ["prisma", "generate"]);
  process.exit(1);
});
