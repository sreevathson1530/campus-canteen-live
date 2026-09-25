import { NextResponse } from "next/server";
import { apiError, clientIp, handler, readJson } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { registerStudent } from "@/lib/users/service";
import { registerSchema } from "@/lib/validators";

export const POST = handler(async (req) => {
  if (!await allow(`register:${clientIp(req)}`, 10, 60_000)) apiError("RATE_LIMITED", "Too many attempts. Try again in a minute.");
  const input = registerSchema.parse(await readJson(req));
  const user = await registerStudent(input);
  await setSessionCookie(user);
  return NextResponse.json({ user }, { status: 201 });
});
