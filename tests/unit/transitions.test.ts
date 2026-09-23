import { describe, expect, it } from "vitest";
import { canTransition, TIMESTAMP_FOR, isFinal } from "@/lib/orders/transitions";
import { queuePositions } from "@/lib/orders/queue";
import type { OrderStatus, Role } from "@/lib/realtime/events";

const STATUSES: OrderStatus[] = ["PLACED", "PREPARING", "READY", "COLLECTED", "CANCELLED", "REJECTED"];
const ROLES: Role[] = ["STUDENT", "STAFF", "ADMIN"];

// [from, to, role, isOwner] combinations that are allowed; everything else must be rejected.
const ALLOWED = new Set([
  "PLACED>PREPARING>STAFF",
  "PLACED>PREPARING>ADMIN",
  "PLACED>CANCELLED>STUDENT>owner",
  "PLACED>REJECTED>STAFF",
  "PLACED>REJECTED>ADMIN",
  "PREPARING>REJECTED>STAFF",
  "PREPARING>REJECTED>ADMIN",
  "PREPARING>READY>STAFF",
  "PREPARING>READY>ADMIN",
  "READY>COLLECTED>STAFF",
  "READY>COLLECTED>ADMIN",
]);

describe("transition rules", () => {
  for (const from of STATUSES) {
    for (const to of STATUSES) {
      for (const role of ROLES) {
        for (const owner of [true, false]) {
          const key = `${from}>${to}>${role}${role === "STUDENT" && owner ? ">owner" : ""}`;
          const expected = ALLOWED.has(key) && (role !== "STUDENT" || owner);
          it(`${from} -> ${to} as ${role}${owner ? " (owner)" : ""}: ${expected ? "allowed" : "denied"}`, () => {
            expect(canTransition(from, to, role, owner)).toBe(expected);
          });
        }
      }
    }
  }

  it("a student can never cancel someone else's order", () => {
    expect(canTransition("PLACED", "CANCELLED", "STUDENT", false)).toBe(false);
  });

  it("staff cannot cancel (they reject with a reason)", () => {
    expect(canTransition("PLACED", "CANCELLED", "STAFF", false)).toBe(false);
  });

  it("final statuses", () => {
    expect(STATUSES.filter(isFinal)).toEqual(["COLLECTED", "CANCELLED", "REJECTED"]);
  });

  it("each move sets its timestamp", () => {
    expect(TIMESTAMP_FOR.PREPARING).toBe("preparingAt");
    expect(TIMESTAMP_FOR.READY).toBe("readyAt");
    expect(TIMESTAMP_FOR.COLLECTED).toBe("collectedAt");
    expect(TIMESTAMP_FOR.CANCELLED).toBe("closedAt");
    expect(TIMESTAMP_FOR.REJECTED).toBe("closedAt");
  });
});

describe("queue position and wait estimate", () => {
  const t = (s: number) => new Date(Date.UTC(2026, 8, 23, 6, 0, s));
  it("orders oldest first; position = index + 1; eta = position × minutesPerOrder", () => {
    const q = queuePositions(
      [
        { id: "c", userId: "u3", createdAt: t(30) },
        { id: "a", userId: "u1", createdAt: t(0) },
        { id: "b", userId: "u2", createdAt: t(10) },
      ],
      3,
    );
    expect(q.map((x) => [x.orderId, x.position, x.etaMinutes])).toEqual([
      ["a", 1, 3],
      ["b", 2, 6],
      ["c", 3, 9],
    ]);
  });
  it("empty queue", () => {
    expect(queuePositions([], 3)).toEqual([]);
  });
});
