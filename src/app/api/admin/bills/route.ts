import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { searchBills } from "@/lib/bills/service";

export const dynamic = "force-dynamic";

export const GET = handler(async (req) => {
  await requireRole("ADMIN");
  const p = new URL(req.url).searchParams;
  const date = p.get("date");
  return NextResponse.json(
    await searchBills({
      q: p.get("q") ?? undefined,
      date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
      page: Number(p.get("page") ?? 1) || 1,
    }),
  );
});
