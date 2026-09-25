/**
 * Case variants for a `contains` search. SQLite's LIKE is case-insensitive for ASCII but
 * PostgreSQL's is not, and Prisma's `mode: "insensitive"` doesn't exist on SQLite, so we match
 * the common casings people type ("asha", "Asha", "ASHA", "asha raman" → "Asha Raman").
 */
export function caseVariants(term: string): string[] {
  const t = term.trim();
  const title = t.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return [...new Set([t, t.toLowerCase(), t.toUpperCase(), title])];
}
