import { prisma } from "./db";
import { businessDate, canteenHour } from "./time";
import { getPresence } from "./realtime/hub";
import type { StatsDTO } from "./realtime/events";

export async function computeStats(date: string = businessDate()): Promise<StatsDTO> {
  const orders = await prisma.order.findMany({
    where: { businessDate: date },
    select: { status: true, totalPaise: true, createdAt: true, readyAt: true, items: { select: { name: true, quantity: true } } },
  });

  const perHour = new Map<number, number>();
  const itemQty = new Map<string, number>();
  let revenue = 0;
  let active = 0;
  let closedBad = 0;
  let prepTotal = 0;
  let prepCount = 0;

  for (const o of orders) {
    const h = canteenHour(o.createdAt);
    perHour.set(h, (perHour.get(h) ?? 0) + 1);
    if (o.status === "COLLECTED") revenue += o.totalPaise;
    if (o.status === "PLACED" || o.status === "PREPARING" || o.status === "READY") active++;
    if (o.status === "CANCELLED" || o.status === "REJECTED") closedBad++;
    if (o.readyAt) {
      prepTotal += (o.readyAt.getTime() - o.createdAt.getTime()) / 1000;
      prepCount++;
    }
    if (o.status !== "CANCELLED" && o.status !== "REJECTED") {
      for (const i of o.items) itemQty.set(i.name, (itemQty.get(i.name) ?? 0) + i.quantity);
    }
  }

  return {
    ordersToday: orders.length,
    revenueTodayPaise: revenue,
    activeOrders: active,
    avgPrepSecondsToday: prepCount ? Math.round(prepTotal / prepCount) : null,
    cancelledOrRejectedToday: closedBad,
    ordersPerHour: Array.from({ length: 24 }, (_, hour) => ({ hour, count: perHour.get(hour) ?? 0 })),
    topItems: [...itemQty.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity })),
    presence: await getPresence(),
  };
}
