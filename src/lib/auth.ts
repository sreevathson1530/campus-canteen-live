import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiError } from "./api";
import type { Role } from "./realtime/events";
import {
  HOME_BY_ROLE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSessionToken,
  verifySessionToken,
  type SessionUser,
} from "./session";

export type { SessionUser };

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(u: { id: string; role: string; name: string }): Promise<void> {
  const token = await signSessionToken(u);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !!process.env.NEXT_PUBLIC_APP_URL?.startsWith("https"),
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Route handlers: 401 without a session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) apiError("UNAUTHORIZED", "Please sign in");
  return user;
}

/** Route handlers: 401 without a session, 403 for the wrong role. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) apiError("FORBIDDEN", "You do not have access to this");
  return user;
}

/** Server layouts and pages: redirect to /login, or to the user's own home for the wrong role. */
export async function requirePageRole(path: string, ...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!roles.includes(user.role)) redirect(HOME_BY_ROLE[user.role]);
  return user;
}
