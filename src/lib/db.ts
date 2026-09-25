import { PrismaClient, type Prisma } from "@prisma/client";

const g = globalThis as unknown as { __prisma?: PrismaClient; __prismaPragmas?: Promise<void> };

/**
 * SQLite allows one writer at a time. With a single process, one pooled connection makes
 * concurrent transactions queue (Prisma's maxWait) instead of failing with SQLITE_BUSY.
 */
function datasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  // Neon's pooled endpoint (PgBouncer, transaction mode) on Vercel: tell Prisma, and keep pools small
  // because every function instance opens its own.
  if (url && url.includes("-pooler.") && !url.includes("pgbouncer=")) {
    return `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true&connection_limit=5&connect_timeout=15`;
  }
  if (!url || !url.startsWith("file:") || url.includes("connection_limit")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=1`;
}

export const prisma: PrismaClient = g.__prisma ?? new PrismaClient({ datasourceUrl: datasourceUrl() });
if (process.env.NODE_ENV !== "production") g.__prisma = prisma;

export const isSqlite = () => (process.env.DATABASE_URL ?? "").startsWith("file:");

/** WAL + busy timeout (see PRD 8.1). SQLite only; PostgreSQL (production) needs neither. */
export function ensurePragmas(): Promise<void> {
  if (!isSqlite()) return Promise.resolve();
  g.__prismaPragmas ??= (async () => {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000");
  })();
  return g.__prismaPragmas;
}

// Every client (the server's and the route handlers') applies the PRAGMAs once.
if (process.env.NODE_ENV !== "test") void ensurePragmas().catch(() => undefined);

export type Tx = Prisma.TransactionClient;

/** Interactive transaction with generous waits, since transactions queue on the single connection. */
export function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { maxWait: 15_000, timeout: 15_000 });
}
