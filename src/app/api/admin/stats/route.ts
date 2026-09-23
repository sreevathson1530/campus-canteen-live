import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { computeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireRole("ADMIN");
  return NextResponse.json({ stats: await computeStats() });
});
