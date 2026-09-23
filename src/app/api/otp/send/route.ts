import { NextResponse } from "next/server";
import { clientIp, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { sendOtp } from "@/lib/otp/service";

export const POST = handler(async (req) => {
  const user = await requireRole("STUDENT");
  return NextResponse.json(await sendOtp(user.id, clientIp(req)));
});
