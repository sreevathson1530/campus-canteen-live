import { prisma } from "./db";
import { businessDate, canteenHour } from "./time";

export interface InsightsDTO {
  days: { date: string; revenuePaise: number; orders: number }[]; // last 7 business days, oldest first
  weekRevenuePaise: number;
  weekOrders: number;
  avgOrderPaise: number | null; // collected orders, last 7 days
  peakHour: number | null; // hour with the most orders over the last 7 days
  repeatStudents: number; // students with 2+ collected orders this week
}

/** Seven-day trends for the admin dashboard. Heavier than live stats, so it is polled, not pushed. */
export async function computeInsights(now: Date = new Date()): Promise<InsightsDTO> {
  const dates = Array.from({ length: 7 }, (_, i) => businessDate(new Date(now.getTime() - (6 - i) * 86_400_000)));
  const orders = await prisma.order.findMany({
    where: { businessDate: { in: dates } },
    select: { businessDate: true, status: true, totalPaise: true, createdAt: true, userId: true },
  });

  const perDay = new Map(dates.map((d) => [d, { revenuePaise: 0, orders: 0 }]));
  const perHour = new Map<number, number>();
  const collectedBy = new Map<string, number>();
  let revenue = 0;
  let collected = 0;
  for (const o of orders) {
    const day = perDay.get(o.businessDate)!;
    if (o.status !== "CANCELLED" && o.status !== "REJECTED") {
      day.orders++;
      const h = canteenHour(o.createdAt);
      perHour.set(h, (perHour.get(h) ?? 0) + 1);
    }
    if (o.status === "COLLECTED") {
      day.revenuePaise += o.totalPaise;
      revenue += o.totalPaise;
      collected++;
      collectedBy.set(o.userId, (collectedBy.get(o.userId) ?? 0) + 1);
    }
  }
  const peak = [...perHour.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];

  return {
    days: dates.map((date) => ({ date, ...perDay.get(date)! })),
    weekRevenuePaise: revenue,
    weekOrders: [...perDay.values()].reduce((n, d) => n + d.orders, 0),
    avgOrderPaise: collected ? Math.round(revenue / collected / 100) * 100 : null, // whole rupees
    peakHour: peak ? peak[0] : null,
    repeatStudents: [...collectedBy.values()].filter((n) => n >= 2).length,
  };
}
