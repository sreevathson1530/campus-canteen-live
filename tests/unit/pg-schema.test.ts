import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PostgreSQL schema", () => {
  it("matches the SQLite schema except for the provider (run npm run db:pg-schema after schema changes)", () => {
    const sqlite = readFileSync("prisma/schema.prisma", "utf8");
    const pg = readFileSync("prisma/postgres/schema.prisma", "utf8").split("\n").slice(1).join("\n");
    expect(pg).toBe(sqlite.replace('provider = "sqlite"', 'provider = "postgresql"'));
  });
});
