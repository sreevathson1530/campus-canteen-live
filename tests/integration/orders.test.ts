import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { placeOrder, transitionStatus, collectByToken } from "@/lib/orders/service";
import { key, makeItem, makeStaff, makeStudent, otpToken, resetDb } from "./helpers";

const codeOf = (p: Promise<unknown>) =>
  p.then(
    () => "OK",
    (e) => (e instanceof ApiError ? e.code : `THROWN:${String(e)}`),
  );

beforeEach(resetDb);

describe("placeOrder", () => {
  it("gets token 101, computes the total from DB prices and decrements stock", async () => {
    const s = await makeStudent();
    const samosa = await makeItem({ name: "Samosa", pricePaise: 1500, stock: 5 });
    const { order, created } = await placeOrder(
      s,
      { lines: [{ menuItemId: samosa.id, quantity: 2, pricePaise: 1 }], otpToken: await otpToken(s.id) },
      key(),
    );
    expect(created).toBe(true);
    expect(order.tokenNumber).toBe(101);
    expect(order.totalPaise).toBe(3000);
    expect(order.status).toBe("PLACED");
    expect((await prisma.menuItem.findUniqueOrThrow({ where: { id: samosa.id } })).stock).toBe(3);
  });

  it("10 parallel orders for an item with stock 3: exactly 3 succeed, stock never below 0", async () => {
    const item = await makeItem({ name: "Samosa", stock: 3 });
    const students = await Promise.all(Array.from({ length: 10 }, (_, i) => makeStudent(`S${i} Test`)));
    const tokens = await Promise.all(students.map((s) => otpToken(s.id)));
    const results = await Promise.all(
      students.map((s, i) => codeOf(placeOrder(s, { lines: [{ menuItemId: item.id, quantity: 1 }], otpToken: tokens[i] }, key()))),
    );
    expect(results.filter((r) => r === "OK")).toHaveLength(3);
    expect(results.filter((r) => r === "OUT_OF_STOCK")).toHaveLength(7);
    expect((await prisma.menuItem.findUniqueOrThrow({ where: { id: item.id } })).stock).toBe(0);
  });

  it("tokens are sequential and unique under parallel orders", async () => {
    const item = await makeItem();
    const students = await Promise.all(Array.from({ length: 8 }, (_, i) => makeStudent(`T${i} Test`)));
    const tokens = await Promise.all(students.map((s) => otpToken(s.id)));
    const orders = await Promise.all(
      students.map((s, i) => placeOrder(s, { lines: [{ menuItemId: item.id, quantity: 1 }], otpToken: tokens[i] }, key())),
    );
    const nums = orders.map((o) => o.order.tokenNumber).sort((a, b) => a - b);
    expect(nums).toEqual([101, 102, 103, 104, 105, 106, 107, 108]);
  });

  it("the same Idempotency-Key returns the same order and creates nothing new", async () => {
    const s = await makeStudent();
    const item = await makeItem();
    const k = key();
    const tok = await otpToken(s.id);
    const body = { lines: [{ menuItemId: item.id, quantity: 1 }], otpToken: tok };
    const [a, b] = await Promise.all([placeOrder(s, body, k), placeOrder(s, body, k)]);
    expect(a.order.id).toBe(b.order.id);
    const c = await placeOrder(s, body, k);
    expect(c.created).toBe(false);
    expect(c.order.id).toBe(a.order.id);
    expect(await prisma.order.count()).toBe(1);
  });

  it("requires a valid, unused OTP token", async () => {
    const s = await makeStudent();
    const item = await makeItem();
    expect(await codeOf(placeOrder(s, { lines: [{ menuItemId: item.id, quantity: 1 }], otpToken: "made-up" }, key()))).toBe("OTP_REQUIRED");
    const tok = await otpToken(s.id);
    await placeOrder(s, { lines: [{ menuItemId: item.id, quantity: 1 }], otpToken: tok }, key());
    expect(await codeOf(placeOrder(s, { lines: [{ menuItemId: item.id, quantity: 1 }], otpToken: tok }, key()))).toBe("OTP_REQUIRED");
  });

  it("another student's token is rejected", async () => {
    const a = await makeStudent();
    const b = await makeStudent("Ravi Kumar");
    const item = await makeItem();
    const tokA = await otpToken(a.id);
    expect(await codeOf(placeOrder(b, { lines: [{ menuItemId: item.id, quantity: 1 }], otpToken: tokA }, key()))).toBe("OTP_REQUIRED");
  });

  it("a failed order leaves the OTP token unused, so the student can retry", async () => {
    const s = await makeStudent();
    const scarce = await makeItem({ stock: 1 });
    const tok = await otpToken(s.id);
    expect(await codeOf(placeOrder(s, { lines: [{ menuItemId: scarce.id, quantity: 2 }], otpToken: tok }, key()))).toBe("OUT_OF_STOCK");
    const ok = await placeOrder(s, { lines: [{ menuItemId: scarce.id, quantity: 1 }], otpToken: tok }, key());
    expect(ok.created).toBe(true);
  });

  it("refuses unavailable items, a closed canteen and too many active orders", async () => {
    const s = await makeStudent();
    const off = await makeItem({ isAvailable: false });
    const item = await makeItem();
    expect(await codeOf(placeOrder(s, { lines: [{ menuItemId: off.id, quantity: 1 }], otpToken: await otpToken(s.id) }, key()))).toBe(
      "ITEM_UNAVAILABLE",
    );

    await prisma.settings.update({ where: { id: 1 }, data: { isOpen: false, closedMessage: "Back at 2 PM" } });
    expect(await codeOf(placeOrder(s, { lines: [{ menuItemId: item.id, quantity: 1 }], otpToken: await otpToken(s.id) }, key()))).toBe(
      "CANTEEN_CLOSED",
    );
    await prisma.settings.update({ where: { id: 1 }, data: { isOpen: true, maxActiveOrders: 2 } });

    for (let i = 0; i < 2; i++) await placeOrder(s, { lines: [{ menuItemId: item.id, quantity: 1 }], otpToken: await otpToken(s.id) }, key());
    expect(await codeOf(placeOrder(s, { lines: [{ menuItemId: item.id, quantity: 1 }], otpToken: await otpToken(s.id) }, key()))).toBe(
      "TOO_MANY_ACTIVE_ORDERS",
    );
  });
});

describe("transitions", () => {
  async function placed() {
    const s = await makeStudent();
    const staff = await makeStaff();
    const item = await makeItem({ stock: 5, pricePaise: 2000 });
    const { order } = await placeOrder(s, { lines: [{ menuItemId: item.id, quantity: 2 }], otpToken: await otpToken(s.id) }, key());
    const actorS = { id: s.id, role: "STUDENT" as const, name: s.name };
    const actorK = { id: staff.id, role: "STAFF" as const, name: staff.name };
    return { s, staff, item, order, actorS, actorK };
  }

  it("parallel transitions with the same expectedVersion: exactly one succeeds", async () => {
    const { order, actorK } = await placed();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => codeOf(transitionStatus(actorK, order.id, { to: "PREPARING", expectedVersion: order.version }))),
    );
    expect(results.filter((r) => r === "OK")).toHaveLength(1);
    expect(results.filter((r) => r === "VERSION_CONFLICT")).toHaveLength(4);
  });

  it("VERSION_CONFLICT carries the current order", async () => {
    const { order, actorK } = await placed();
    await transitionStatus(actorK, order.id, { to: "PREPARING", expectedVersion: 1 });
    try {
      await transitionStatus(actorK, order.id, { to: "PREPARING", expectedVersion: 1 });
      expect.unreachable();
    } catch (e) {
      expect((e as ApiError).code).toBe("VERSION_CONFLICT");
      expect(((e as ApiError).details as { order: { status: string } }).order.status).toBe("PREPARING");
    }
  });

  it("cancel restores stock; only the owner can cancel", async () => {
    const { s, item, order, actorS } = await placed();
    const other = await makeStudent("Meena Iyer");
    expect(await codeOf(transitionStatus({ id: other.id, role: "STUDENT", name: other.name }, order.id, { to: "CANCELLED", expectedVersion: 1 }))).toBe(
      "FORBIDDEN",
    );
    expect((await prisma.menuItem.findUniqueOrThrow({ where: { id: item.id } })).stock).toBe(3);
    const done = await transitionStatus(actorS, order.id, { to: "CANCELLED", expectedVersion: 1 });
    expect(done.status).toBe("CANCELLED");
    expect(done.closedAt).not.toBeNull();
    expect((await prisma.menuItem.findUniqueOrThrow({ where: { id: item.id } })).stock).toBe(5);
    expect(s.id).toBeTruthy();
  });

  it("reject needs a reason and restores stock", async () => {
    const { item, order, actorK } = await placed();
    expect(await codeOf(transitionStatus(actorK, order.id, { to: "REJECTED", expectedVersion: 1, reason: "no" }))).toBe("VALIDATION_ERROR");
    const r = await transitionStatus(actorK, order.id, { to: "REJECTED", expectedVersion: 1, reason: "Item ran out" });
    expect(r.rejectReason).toBe("Item ran out");
    expect((await prisma.menuItem.findUniqueOrThrow({ where: { id: item.id } })).stock).toBe(5);
  });

  it("invalid moves are rejected", async () => {
    const { order, actorK, actorS } = await placed();
    expect(await codeOf(transitionStatus(actorK, order.id, { to: "READY", expectedVersion: 1 }))).toBe("INVALID_TRANSITION");
    expect(await codeOf(transitionStatus(actorS, order.id, { to: "PREPARING", expectedVersion: 1 }))).toBe("FORBIDDEN");
  });

  it("collect by token only works on a READY order", async () => {
    const { order, actorK } = await placed();
    expect(await codeOf(collectByToken(actorK, order.tokenNumber))).toBe("INVALID_TRANSITION");
    expect(await codeOf(collectByToken(actorK, 999))).toBe("NOT_FOUND");
    await transitionStatus(actorK, order.id, { to: "PREPARING", expectedVersion: 1 });
    await transitionStatus(actorK, order.id, { to: "READY", expectedVersion: 2 });
    const done = await collectByToken(actorK, order.tokenNumber);
    expect(done.status).toBe("COLLECTED");
    expect(done.billNumber).toMatch(/^CCL-\d{8}-101$/);
  });
});
