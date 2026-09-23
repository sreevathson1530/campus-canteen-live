// Pure JWT helpers with no Next.js imports, shared by route handlers and the Socket.IO handshake.
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./realtime/events";

export const SESSION_COOKIE = "ccl_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  role: Role;
  name: string;
  firstName: string;
}

function key(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
  return new TextEncoder().encode(secret);
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export async function signSessionToken(u: { id: string; role: string; name: string }): Promise<string> {
  return new SignJWT({ role: u.role, name: u.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(u.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key());
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const role = payload.role;
    if (typeof payload.sub !== "string" || typeof payload.name !== "string") return null;
    if (role !== "STUDENT" && role !== "STAFF" && role !== "ADMIN") return null;
    return { id: payload.sub, role, name: payload.name, firstName: firstNameOf(payload.name) };
  } catch {
    return null;
  }
}

export const HOME_BY_ROLE: Record<Role, string> = { STUDENT: "/menu", STAFF: "/kitchen", ADMIN: "/admin" };

/** Only same-site relative paths are accepted for ?next= redirects. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
