import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { verifyOtp } from "@/lib/otp/service";
import { otpVerifySchema } from "@/lib/validators";

export const POST = handler(async (req) => {
  const user = await requireRole("STUDENT");
  const { code } = otpVerifySchema.parse(await readJson(req));
  return NextResponse.json(await verifyOtp(user.id, code));
});
