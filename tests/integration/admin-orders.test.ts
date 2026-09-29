import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { placeOrder, transitionStatus } from "@/lib/orders/service";
import { computeEarnings, listAdminOrders, monthStart, weekStart } from "@/lib/orders/admin";
import { billEmail, sendBillEmail } from "@/lib/bills/email";
import { businessDate } from "@/lib/time";
import { key, makeItem, makeStaff, makeStudent, otpToken, resetDb } from "./helpers";

beforeEach(resetDb);

async function order(studentId: string, menuItemId: string, quantity = 1) {
  const s = await prisma.user.findUniqueOrThrow({ where: { id: studentId } });
  return (await placeOrder(s, { lines: [{ menuItemId, quantity }], otpToken: await otpToken(s.id) }, key())).order;
}

async function collect(orderId: string) {
  const staff = await makeStaff();
  const k = { id: staff.id, role: "STAFF" as const, name: staff.name };
  await transitionStatus(k, orderId, { to: "PREPARING", expectedVersion: 1 });
  await transitionStatus(k, orderId, { to: "READY", expectedVersion: 2 });
  return transitionStatus(k, orderId, { to: "COLLECTED", expectedVersion: 3 });
}

describe("date ranges", () => {
  it("weeks start on Monday, months on the 1st", () => {
    expect(weekStart("2026-09-29")).toBe("2026-09-28"); // Tuesday -> Monday
    expect(weekStart("2026-09-28")).toBe("2026-09-28"); // Monday
    expect(weekStart("2026-10-04")).toBe("2026-09-28"); // Sunday -> previous Monday
    expect(weekStart("2026-01-01")).toBe("2025-12-29"); // across a year
    expect(monthStart("2026-09-29")).toBe("2026-09-01");
  });
});

describe("admin orders", () => {
  it("earnings count only collected orders, for today, the week and the month", async () => {
    const a = await makeStudent("Asha Raman");
    const dosa = await makeItem({ pricePaise: 5000 });
    const done = await order(a.id, dosa.id, 2);
    await collect(done.id);
    await order(a.id, dosa.id); // still active: not earned yet

    // An old collected order from a previous month counts in none of the three.
    const old = await order(a.id, dosa.id);
    await collect(old.id);
    await prisma.order.update({ where: { id: old.id }, data: { businessDate: "2020-01-15" } });

    const e = await computeEarnings();
    expect(e.today).toBe(businessDate());
    for (const period of [e.day, e.week, e.month]) expect(period).toEqual({ revenuePaise: 10000, orders: 1 });
  });

  it("lists current orders oldest first with student details, and filters by range, status and search", async () => {
    const a = await makeStudent("Asha Raman");
    const r = await makeStudent("Ravi Kumar");
    const dosa = await makeItem();
    const first = await order(a.id, dosa.id);
    const second = await order(r.id, dosa.id);
    await collect(first.id);

    const current = await listAdminOrders({ range: "active" });
    expect(current.orders.map((o) => o.id)).toEqual([second.id]);
    expect(current.orders[0].student).toEqual({ name: "Ravi Kumar", email: r.email, phone: r.phone });

    const today = await listAdminOrders({ range: "today" });
    expect(today.total).toBe(2);
    expect(today.orders[0].id).toBe(second.id); // newest first outside "current"
    expect(today.statusCounts).toMatchObject({ PLACED: 1, COLLECTED: 1 });
    expect(today.orders.find((o) => o.id === first.id)?.bill?.billNumber).toMatch(/^CCL-\d{8}-\d+$/);

    expect((await listAdminOrders({ range: "today", status: "COLLECTED" })).orders.map((o) => o.id)).toEqual([first.id]);
    expect((await listAdminOrders({ range: "all", q: "ravi" })).orders.map((o) => o.id)).toEqual([second.id]);
    expect((await listAdminOrders({ range: "all", q: String(first.tokenNumber) })).orders.map((o) => o.id)).toContain(first.id);
    expect((await listAdminOrders({ range: "all", q: a.email })).orders.map((o) => o.id)).toEqual([first.id]);
  });
});

describe("bill email", () => {
  it("sends the bill to the student's email once, records when, and resends on request", async () => {
    const a = await makeStudent("Asha Raman");
    const dosa = await makeItem({ name: "Masala Dosa", pricePaise: 5000 });
    const o = await order(a.id, dosa.id, 2);
    expect(await sendBillEmail(o.id).then(() => "OK", (e) => (e instanceof ApiError ? e.code : String(e)))).toBe("NOT_FOUND");

    await collect(o.id);
    const first = await sendBillEmail(o.id);
    expect(first.to).toBe(a.email);
    const again = await sendBillEmail(o.id); // already sent: no second email
    expect(again.emailedAt).toBe(first.emailedAt);
    const forced = await sendBillEmail(o.id, { force: true });
    expect(forced.emailedAt >= first.emailedAt).toBe(true);
    expect((await prisma.bill.findUniqueOrThrow({ where: { orderId: o.id } })).emailedAt?.toISOString()).toBe(forced.emailedAt);
  });

  it("the email lists every dish and the total, with names escaped", () => {
    const m = billEmail(
      {
        billNumber: "CCL-20260929-101",
        tokenNumber: 101,
        studentName: "<Asha>",
        totalPaise: 11500,
        orderedAt: new Date(),
        collectedAt: new Date(),
        lines: [
          { name: "Masala Dosa", quantity: 2, unitPricePaise: 5000, lineTotalPaise: 10000 },
          { name: "Filter Coffee", quantity: 1, unitPricePaise: 1500, lineTotalPaise: 1500 },
        ],
      },
      "Campus Canteen",
    );
    expect(m.subject).toBe("Your Campus Canteen bill CCL-20260929-101 · ₹115");
    expect(m.text).toContain("2 × Masala Dosa @ ₹50 = ₹100");
    expect(m.text).toContain("Total: ₹115");
    expect(m.html).toContain("&lt;Asha&gt;");
    expect(m.html).not.toContain("<Asha>");
  });
});
