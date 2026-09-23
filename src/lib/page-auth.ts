import { headers } from "next/headers";
import { requirePageRole } from "./auth";
import type { Role } from "./realtime/events";

/** Server layouts: current path from the proxy header, then the role check (redirects when needed). */
export async function guardLayout(fallbackPath: string, ...roles: Role[]) {
  const h = await headers();
  const path = h.get("x-pathname") || fallbackPath;
  return requirePageRole(path, ...roles);
}
