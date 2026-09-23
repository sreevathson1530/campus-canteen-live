import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { __prisma?: PrismaClient; __prismaPragmas?: Promise<void> };

export const prisma: PrismaClient = g.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.__prisma = prisma;

/** WAL + busy timeout so concurrent writers wait instead of failing with SQLITE_BUSY. */
export function ensurePragmas(): Promise<void> {
  g.__prismaPragmas ??= (async () => {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000");
  })();
  return g.__prismaPragmas;
}

export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
