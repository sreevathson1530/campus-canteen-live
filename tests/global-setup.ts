import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

/**
 * Builds a fresh, throwaway prisma/test.db for the suite. Only this test file is removed,
 * never dev.db, then the schema is pushed into the empty file (no reset needed).
 */
export default function setup(): void {
  // PostgreSQL runs (npm run test:pg) are migrated by scripts/test-postgres.ts instead.
  if (process.env.TEST_DATABASE_URL) return;
  const dir = path.resolve(__dirname, "../prisma");
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(path.join(dir, `test.db${suffix}`), { force: true });
  }
  const prismaBin = path.resolve(__dirname, "../node_modules/prisma/build/index.js");
  execFileSync(process.execPath, [prismaBin, "db", "push", "--skip-generate"], {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./test.db", PRISMA_HIDE_UPDATE_MESSAGE: "1" },
  });
}
