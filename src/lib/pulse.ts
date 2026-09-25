import { prisma } from "./db";
import { businessDate } from "./time";
import { getSettings } from "./settings";

/** Public, anonymous snapshot of how busy the canteen is and what's selling. No personal data. */
export interface Pulse {
  isOpen: boolean;
  queueLength: number; // today's PLACED + PREPARING orders
  waitMinutes: number; // estimated wait for an order placed now
  busy: boolean;
  servedToday: number; // COLLECTED orders today
  popular: { id: string; quantity: number }[]; // menu item ids, best sellers of the last 7 days
}

const BUSY_QUEUE = 5;

export async function getPulse(): Promise<Pulse> {
  const today = businessDate();
  const since = new Date(Date.now() - 7 * 24 * 3600_000);
  const [settings, queueLength, servedToday, sales] = await Promise.all([
    getSettings(),
    prisma.order.count({ where: { businessDate: today, status: { in: ["PLACED", "PREPARING"] } } }),
    prisma.order.count({ where: { businessDate: today, status: "COLLECTED" } }),
    prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: { order: { createdAt: { gte: since }, status: { notIn: ["CANCELLED", "REJECTED"] } } },
      _sum: { quantity: true },
    }),
  ]);
  const popular = sales
    .map((s) => ({ id: s.menuItemId, quantity: s._sum.quantity ?? 0 }))
    .sort((a, b) => b.quantity - a.quantity || a.id.localeCompare(b.id))
    .slice(0, 8);
  return {
    isOpen: settings.isOpen,
    queueLength,
    waitMinutes: (queueLength + 1) * settings.minutesPerOrder,
    busy: queueLength >= BUSY_QUEUE,
    servedToday,
    popular,
  };
}
