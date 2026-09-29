import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { computeEarnings, listAdminOrders } from "@/lib/orders/admin";

export const dynamic = "force-dynamic";

export const GET = handler(async (req) => {
  await requireRole("ADMIN");
  const p = new URL(req.url).searchParams;
  const [list, earnings] = await Promise.all([
    listAdminOrders({
      range: p.get("range") ?? undefined,
      status: p.get("status") ?? undefined,
      q: p.get("q") ?? undefined,
      page: Number(p.get("page") ?? 1) || 1,
    }),
    computeEarnings(),
  ]);
  return NextResponse.json({ ...list, earnings });
});
