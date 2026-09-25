// Every real-time event goes through this file, and only after the database transaction has committed.
// Events are published to the bus; each WebSocket hub delivers them to its sockets in the listed rooms.
import { waitUntil } from "@vercel/functions";
import { prisma } from "../db";
import { businessDate } from "../time";
import { queuePositions } from "../orders/queue";
import { publish } from "./bus";
import type { CanteenStatus, MenuItemDTO, OrderDTO } from "./events";

export function emitOrderCreated(order: OrderDTO): Promise<void> {
  return publish({ rooms: ["kitchen"], event: "order:created", payload: order });
}

export function emitOrderUpdated(order: OrderDTO, ownerId: string): Promise<void> {
  return publish({ rooms: ["kitchen", `user:${ownerId}`], event: "order:updated", payload: order });
}

/** Recomputes the queue and tells each student with a queued order their position and ETA. */
export async function emitQueueUpdates(): Promise<void> {
  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { businessDate: businessDate(), status: { in: ["PLACED", "PREPARING"] } },
      select: { id: true, userId: true, createdAt: true },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  await Promise.all(
    queuePositions(orders, settings?.minutesPerOrder ?? 3).map((q) =>
      publish({
        rooms: [`user:${q.userId}`],
        event: "queue:update",
        payload: { orderId: q.orderId, position: q.position, etaMinutes: q.etaMinutes },
      }),
    ),
  );
}

export function emitMenuItemUpdated(item: MenuItemDTO): Promise<void> {
  return publish({ rooms: ["public"], event: "menu:item-updated", payload: item });
}

export function emitMenuChanged(reason: string): Promise<void> {
  return publish({ rooms: ["public"], event: "menu:changed", payload: { reason } });
}

export function emitCanteenStatus(status: CanteenStatus): Promise<void> {
  return publish({ rooms: ["public"], event: "canteen:status", payload: status });
}

const g = globalThis as unknown as { __statsTimer?: Promise<void> | null; __statsLast?: number };

/**
 * Pushes live stats to admins at most once per second (trailing edge, so the latest state always goes
 * out). waitUntil keeps a serverless function alive for the delayed send; locally it is a no-op.
 */
export function scheduleStatsUpdate(): void {
  if (process.env.NODE_ENV === "test" || g.__statsTimer) return;
  const since = Date.now() - (g.__statsLast ?? 0);
  g.__statsTimer = new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, 1000 - since))).then(async () => {
    g.__statsTimer = null;
    g.__statsLast = Date.now();
    try {
      const { computeStats } = await import("../stats");
      await publish({ rooms: ["admin"], event: "stats:update", payload: await computeStats() });
    } catch (err) {
      console.error("[stats] failed", err);
    }
  });
  try {
    waitUntil(g.__statsTimer);
  } catch {
    // Not running on Vercel: the long-lived process keeps the timer alive.
  }
}
