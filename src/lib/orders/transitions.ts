import type { OrderStatus, Role } from "../realtime/events";

type Who = "STAFF" | "OWNER";

/** The only allowed moves (PRD section 3). Anything else is INVALID_TRANSITION. */
const RULES: Record<OrderStatus, Partial<Record<OrderStatus, Who>>> = {
  PLACED: { PREPARING: "STAFF", CANCELLED: "OWNER", REJECTED: "STAFF" },
  PREPARING: { READY: "STAFF", REJECTED: "STAFF" },
  READY: { COLLECTED: "STAFF" },
  COLLECTED: {},
  CANCELLED: {},
  REJECTED: {},
};

export function isKnownTransition(from: OrderStatus, to: OrderStatus): boolean {
  return RULES[from][to] !== undefined;
}

export function canTransition(from: OrderStatus, to: OrderStatus, role: Role, isOwner: boolean): boolean {
  const who = RULES[from][to];
  if (!who) return false;
  if (who === "STAFF") return role === "STAFF" || role === "ADMIN";
  return role === "STUDENT" && isOwner;
}

export function isFinal(s: OrderStatus): boolean {
  return s === "COLLECTED" || s === "CANCELLED" || s === "REJECTED";
}

export const ACTIVE_STATUSES: OrderStatus[] = ["PLACED", "PREPARING", "READY"];

export const TIMESTAMP_FOR = {
  PREPARING: "preparingAt",
  READY: "readyAt",
  COLLECTED: "collectedAt",
  CANCELLED: "closedAt",
  REJECTED: "closedAt",
} as const satisfies Partial<Record<OrderStatus, string>>;
