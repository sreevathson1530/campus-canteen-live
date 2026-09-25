import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { computeInsights } from "@/lib/insights";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireRole("ADMIN");
  return NextResponse.json({ insights: await computeInsights() });
});
