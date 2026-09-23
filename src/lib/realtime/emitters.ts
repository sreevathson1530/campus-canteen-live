// Every Socket.IO emit goes through this file, and only after the database transaction has committed.
import { prisma } from "../db";
import { businessDate } from "../time";
import { queuePositions } from "../orders/queue";
import type { CanteenStatus, MenuItemDTO, OrderDTO } from "./events";
import { getIO } from "./io";

export function emitOrderCreated(order: OrderDTO): void {
  getIO()?.to("kitchen").emit("order:created", order);
}

export function emitOrderUpdated(order: OrderDTO, ownerId: string): void {
  getIO()?.to(["kitchen", `user:${ownerId}`]).emit("order:updated", order);
}

/** Recomputes the queue and tells each student with a queued order their position and ETA. */
export async function emitQueueUpdates(): Promise<void> {
  const io = getIO();
  if (!io) return;
  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { businessDate: businessDate(), status: { in: ["PLACED", "PREPARING"] } },
      select: { id: true, userId: true, createdAt: true },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  for (const q of queuePositions(orders, settings?.minutesPerOrder ?? 3)) {
    io.to(`user:${q.userId}`).emit("queue:update", { orderId: q.orderId, position: q.position, etaMinutes: q.etaMinutes });
  }
}

export function emitMenuItemUpdated(item: MenuItemDTO): void {
  getIO()?.to("public").emit("menu:item-updated", item);
}

export function emitMenuChanged(reason: string): void {
  getIO()?.to("public").emit("menu:changed", { reason });
}

export function emitCanteenStatus(status: CanteenStatus): void {
  getIO()?.to("public").emit("canteen:status", status);
}

const g = globalThis as unknown as { __statsTimer?: ReturnType<typeof setTimeout> | null; __statsLast?: number };

/** Pushes live stats to admins at most once per second (trailing edge, so the latest state always goes out). */
export function scheduleStatsUpdate(): void {
  if (!getIO() || g.__statsTimer) return;
  const since = Date.now() - (g.__statsLast ?? 0);
  g.__statsTimer = setTimeout(
    async () => {
      g.__statsTimer = null;
      g.__statsLast = Date.now();
      try {
        const { computeStats } = await import("../stats");
        getIO()?.to("admin").emit("stats:update", await computeStats());
      } catch (err) {
        console.error("[stats] failed", err);
      }
    },
    Math.max(0, 1000 - since),
  );
}
