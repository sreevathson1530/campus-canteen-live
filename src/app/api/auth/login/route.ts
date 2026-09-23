import { NextResponse } from "next/server";
import { apiError, clientIp, handler, readJson } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { HOME_BY_ROLE } from "@/lib/session";
import { toPublicUser, verifyLogin } from "@/lib/users/service";
import { loginSchema } from "@/lib/validators";
import type { Role } from "@/lib/realtime/events";

export const POST = handler(async (req) => {
  if (!rateLimit(`login:${clientIp(req)}`, 10, 60_000)) apiError("RATE_LIMITED", "Too many sign-in attempts. Try again in a minute.");
  const { email, password } = loginSchema.parse(await readJson(req));
  const user = await verifyLogin(email, password);
  if (!user) apiError("UNAUTHORIZED", "Email or password is incorrect");
  await setSessionCookie(user);
  return NextResponse.json({ user: toPublicUser(user), home: HOME_BY_ROLE[user.role as Role] });
});
