import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { placeOrder, transitionStatus } from "@/lib/orders/service";
import { getPulse } from "@/lib/pulse";
import { computeInsights } from "@/lib/insights";
import { updateItem } from "@/lib/menu/service";
import { toMenuItemDTO } from "@/lib/dto";
import { key, makeItem, makeStaff, makeStudent, otpToken, resetDb } from "./helpers";

beforeEach(resetDb);

async function order(studentId: string, items: { menuItemId: string; quantity: number }[]) {
  const s = await prisma.user.findUniqueOrThrow({ where: { id: studentId } });
  return (await placeOrder(s, { lines: items, otpToken: await otpToken(s.id) }, key())).order;
}

describe("pulse", () => {
  it("counts the queue, estimates the wait and ranks best sellers", async () => {
    const a = await makeStudent();
    const b = await makeStudent();
    const dosa = await makeItem({ name: "Masala Dosa" });
    const tea = await makeItem({ name: "Tea" });

    const empty = await getPulse();
    expect(empty).toMatchObject({ isOpen: true, queueLength: 0, waitMinutes: 3, busy: false, servedToday: 0, popular: [] });

    await order(a.id, [{ menuItemId: tea.id, quantity: 1 }]);
    await order(b.id, [{ menuItemId: dosa.id, quantity: 3 }]);
    const p = await getPulse();
    expect(p.queueLength).toBe(2);
    expect(p.waitMinutes).toBe(9); // (2 ahead + yours) × 3 min
    expect(p.popular).toEqual([
      { id: dosa.id, quantity: 3 },
      { id: tea.id, quantity: 1 },
    ]);
    // Only ids and counts: no names, phones or order details leak to anonymous visitors.
    expect(Object.keys(p).sort()).toEqual(["busy", "isOpen", "popular", "queueLength", "servedToday", "waitMinutes"]);
  });

  it("cancelled orders don't count as sales or queue", async () => {
    const a = await makeStudent();
    const dosa = await makeItem();
    const o = await order(a.id, [{ menuItemId: dosa.id, quantity: 2 }]);
    await transitionStatus({ id: a.id, role: "STUDENT", name: a.name }, o.id, { to: "CANCELLED", expectedVersion: 1 });
    const p = await getPulse();
    expect(p.queueLength).toBe(0);
    expect(p.popular).toEqual([]);
  });
});

describe("insights", () => {
  it("sums collected revenue per day, peak hour and repeat students", async () => {
    const a = await makeStudent();
    const staff = await makeStaff();
    const k = { id: staff.id, role: "STAFF" as const, name: staff.name };
    const dosa = await makeItem({ pricePaise: 5000 });
    for (let i = 0; i < 2; i++) {
      const o = await order(a.id, [{ menuItemId: dosa.id, quantity: 1 }]);
      await transitionStatus(k, o.id, { to: "PREPARING", expectedVersion: 1 });
      await transitionStatus(k, o.id, { to: "READY", expectedVersion: 2 });
      await transitionStatus(k, o.id, { to: "COLLECTED", expectedVersion: 3 });
    }
    const ins = await computeInsights();
    expect(ins.days).toHaveLength(7);
    expect(ins.days[6]).toMatchObject({ revenuePaise: 10000, orders: 2 });
    expect(ins.weekRevenuePaise).toBe(10000);
    expect(ins.avgOrderPaise).toBe(5000);
    expect(ins.peakHour).not.toBeNull();
    expect(ins.repeatStudents).toBe(1);
  });
});

describe("dish details", () => {
  it("a one-field patch leaves stock, availability and details alone", async () => {
    const item = await makeItem({ stock: 7 });
    await prisma.menuItem.update({ where: { id: item.id }, data: { spiceLevel: 2, tags: "bestseller", pairsWith: "Tea, Samosa", sortOrder: 4 } });
    const dto = await updateItem(item.id, { name: "Renamed Dish" });
    expect(dto).toMatchObject({ name: "Renamed Dish", stock: 7, isAvailable: true, spiceLevel: 2, sortOrder: 4, tags: ["bestseller"], pairsWith: ["Tea", "Samosa"] });
  });

  it("lists are trimmed and empty strings become empty arrays", async () => {
    const item = await makeItem();
    const m = await prisma.menuItem.update({ where: { id: item.id }, data: { ingredients: " Rice ,, Dal ", allergens: null, tags: "" } });
    expect(toMenuItemDTO(m)).toMatchObject({ ingredients: ["Rice", "Dal"], allergens: [], tags: [], calories: null });
  });
});
