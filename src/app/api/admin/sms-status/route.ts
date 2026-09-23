import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { smsStatus } from "@/lib/otp/service";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireRole("ADMIN");
  return NextResponse.json(await smsStatus());
});
