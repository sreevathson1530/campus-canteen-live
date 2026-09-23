import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { clearSessionCookie, requireUser } from "@/lib/auth";

export const POST = handler(async () => {
  await requireUser();
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
});
