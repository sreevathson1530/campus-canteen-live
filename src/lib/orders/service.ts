import { prisma, transaction } from "../db";
import { apiError, ApiError } from "../api";
import { orderInclude, toMenuItemDTO, toOrderDTO } from "../dto";
import { businessDate } from "../time";
import { consumeOtpToken } from "../otp/service";
import { createBillInTx } from "../bills/service";
import { queuePositions } from "./queue";
import { ACTIVE_STATUSES, canTransition, isKnownTransition, TIMESTAMP_FOR } from "./transitions";
import { placeOrderSchema, rejectReasonOk, transitionSchema } from "../validators";
import {
  emitMenuItemUpdated,
  emitOrderCreated,
  emitOrderUpdated,
  emitQueueUpdates,
  scheduleStatsUpdate,
} from "../realtime/emitters";
import type { MenuItemDTO, OrderDTO, OrderStatus, Role } from "../realtime/events";
import type { MenuItem } from "@prisma/client";

export interface Actor {
  id: string;
  role: Role;
  name: string;
}

export interface OrderView {
  order: OrderDTO;
  queue: { position: number; etaMinutes: number } | null;
}

async function loadOrderDTO(id: string): Promise<OrderDTO> {
  const o = await prisma.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
  return toOrderDTO(o);
}

/** Fan-out after commit, in the order the PRD lists. Failures here never undo the write. */
async function afterCommit(fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error("[emit] failed after commit", err);
  }
}

// ---------------------------------------------------------------- place order

export async function placeOrder(
  user: { id: string },
  rawBody: unknown,
  idempotencyKey: string | null,
): Promise<{ order: OrderDTO; created: boolean }> {
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 100) {
    apiError("VALIDATION_ERROR", "Idempotency-Key header is required");
  }

  // 1. Same key from this user: return the existing order, create nothing.
  const existing = await prisma.order.findUnique({ where: { idempotencyKey }, include: orderInclude });
  if (existing) {
    if (existing.userId !== user.id) apiError("VALIDATION_ERROR", "Idempotency-Key already used");
    return { order: toOrderDTO(existing), created: false };
  }

  // 2. Validate; canteen open.
  const body = placeOrderSchema.parse(rawBody);
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (settings && !settings.isOpen) apiError("CANTEEN_CLOSED", settings.closedMessage || "The canteen is closed right now");

  // 3. Active-order limit.
  const date = businessDate();
  const active = await prisma.order.count({ where: { userId: user.id, businessDate: date, status: { in: ACTIVE_STATUSES } } });
  const max = settings?.maxActiveOrders ?? 3;
  if (active >= max) apiError("TOO_MANY_ACTIVE_ORDERS", `You can have up to ${max} active orders at a time`);

  // 4. One transaction: OTP token, availability, stock, prices, token number, order.
  let stockChanged: MenuItem[] = [];
  let orderId: string;
  try {
    const result = await transaction(async (tx) => {
      const otpHash = await consumeOtpToken(tx, user.id, body.otpToken);

      const ids = body.lines.map((l) => l.menuItemId);
      const items = await tx.menuItem.findMany({ where: { id: { in: ids } } });
      const byId = new Map(items.map((i) => [i.id, i]));
      for (const line of body.lines) {
        const item = byId.get(line.menuItemId);
        if (!item || item.isArchived || !item.isAvailable) {
          apiError("ITEM_UNAVAILABLE", `${item?.name ?? "An item"} is no longer available`, { menuItemId: line.menuItemId, name: item?.name ?? null });
        }
      }

      // Conditional decrement: exactly the protection against overselling. Rows are locked in
      // id order so two concurrent orders can't deadlock on PostgreSQL.
      const decremented: string[] = [];
      for (const line of [...body.lines].sort((a, b) => a.menuItemId.localeCompare(b.menuItemId))) {
        const item = byId.get(line.menuItemId)!;
        if (item.stock === null) continue;
        const res = await tx.menuItem.updateMany({
          where: { id: item.id, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (res.count === 0) {
          const fresh = await tx.menuItem.findUnique({ where: { id: item.id }, select: { stock: true } });
          apiError("OUT_OF_STOCK", `Only ${fresh?.stock ?? 0} ${item.name} left`, {
            menuItemId: item.id,
            name: item.name,
            remaining: fresh?.stock ?? 0,
          });
        }
        decremented.push(item.id);
      }

      // Totals from database prices only.
      const totalPaise = body.lines.reduce((sum, l) => sum + byId.get(l.menuItemId)!.pricePaise * l.quantity, 0);

      const counter = await tx.dailyCounter.upsert({
        where: { businessDate: date },
        create: { businessDate: date, lastToken: 101 },
        update: { lastToken: { increment: 1 } },
      });

      const order = await tx.order.create({
        data: {
          tokenNumber: counter.lastToken,
          businessDate: date,
          totalPaise,
          note: body.note,
          idempotencyKey,
          userId: user.id,
          items: {
            create: body.lines.map((l) => {
              const item = byId.get(l.menuItemId)!;
              return { menuItemId: item.id, name: item.name, unitPricePaise: item.pricePaise, quantity: l.quantity };
            }),
          },
        },
      });
      await tx.otpChallenge.updateMany({ where: { tokenHash: otpHash }, data: { orderId: order.id } });

      const changed = decremented.length ? await tx.menuItem.findMany({ where: { id: { in: decremented } } }) : [];
      return { orderId: order.id, changed };
    });
    orderId = result.orderId;
    stockChanged = result.changed;
  } catch (err) {
    // A concurrent request with the same key may have won the race (it then used the OTP token,
    // or hit the unique key first). Either way the retry gets that order, not an error.
    const again = await prisma.order.findUnique({ where: { idempotencyKey }, include: orderInclude });
    if (again && again.userId === user.id) return { order: toOrderDTO(again), created: false };
    throw err;
  }

  // 5. After commit.
  const dto = await loadOrderDTO(orderId);
  await afterCommit(async () => {
    await emitOrderCreated(dto);
    await Promise.all(stockChanged.map((item) => emitMenuItemUpdated(toMenuItemDTO(item))));
    await emitQueueUpdates();
    scheduleStatsUpdate();
  });
  return { order: dto, created: true };
}


// ---------------------------------------------------------------- status changes

export async function transitionStatus(actor: Actor, orderId: string, rawBody: unknown): Promise<OrderDTO> {
  const { to, expectedVersion, reason } = transitionSchema.parse(rawBody);
  return applyTransition(actor, orderId, to, expectedVersion, reason);
}

async function applyTransition(
  actor: Actor,
  orderId: string,
  to: OrderStatus,
  expectedVersion: number,
  reason?: string,
): Promise<OrderDTO> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) apiError("NOT_FOUND", "Order not found");
  const from = order.status as OrderStatus;
  const isOwner = order.userId === actor.id;

  if (actor.role === "STUDENT" && !isOwner) apiError("FORBIDDEN", "This isn't your order");
  if (!isKnownTransition(from, to)) {
    // A stale client may try a move that was valid a moment ago; tell it the current state.
    if (order.version !== expectedVersion) apiError("VERSION_CONFLICT", "Already updated by someone else", { order: await loadOrderDTO(orderId) });
    apiError("INVALID_TRANSITION", `Can't move an order from ${from} to ${to}`);
  }
  if (!canTransition(from, to, actor.role, isOwner)) apiError("FORBIDDEN", "You can't make this change");
  if (to === "REJECTED" && !rejectReasonOk(reason)) apiError("VALIDATION_ERROR", "Give a reason (3-140 characters)");

  const now = new Date();
  const restoreStock = to === "CANCELLED" || to === "REJECTED";
  let restored: MenuItem[] = [];

  await transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, version: expectedVersion, status: from },
      data: {
        status: to,
        version: { increment: 1 },
        [TIMESTAMP_FOR[to as keyof typeof TIMESTAMP_FOR]]: now,
        ...(to === "REJECTED" && { rejectReason: reason!.trim() }),
      },
    });
    if (res.count === 0) {
      throw new ApiError("VERSION_CONFLICT", "Already updated by another staff member");
    }

    if (restoreStock) {
      const limited = await tx.menuItem.findMany({
        where: { id: { in: order.items.map((i) => i.menuItemId) }, stock: { not: null } },
        select: { id: true },
      });
      const limitedIds = new Set(limited.map((l) => l.id));
      for (const line of [...order.items].sort((a, b) => a.menuItemId.localeCompare(b.menuItemId))) {
        if (!limitedIds.has(line.menuItemId)) continue;
        await tx.menuItem.update({ where: { id: line.menuItemId }, data: { stock: { increment: line.quantity } } });
      }
      restored = limitedIds.size ? await tx.menuItem.findMany({ where: { id: { in: [...limitedIds] } } }) : [];
    }

    if (to === "COLLECTED") await createBillInTx(tx, orderId, actor.name, now);
  }).catch(async (err) => {
    if (err instanceof ApiError && err.code === "VERSION_CONFLICT") {
      apiError("VERSION_CONFLICT", err.message, { order: await loadOrderDTO(orderId) });
    }
    throw err;
  });

  const dto = await loadOrderDTO(orderId);
  await afterCommit(async () => {
    await emitOrderUpdated(dto, order.userId);
    await Promise.all(restored.map((item) => emitMenuItemUpdated(toMenuItemDTO(item))));
    await emitQueueUpdates();
    scheduleStatsUpdate();
  });
  return dto;
}

/** Collect box: moves today's READY order with this token to COLLECTED. */
export async function collectByToken(actor: Actor, tokenNumber: number): Promise<OrderDTO> {
  if (actor.role !== "STAFF" && actor.role !== "ADMIN") apiError("FORBIDDEN", "Staff only");
  const order = await prisma.order.findUnique({
    where: { businessDate_tokenNumber: { businessDate: businessDate(), tokenNumber } },
  });
  if (!order) apiError("NOT_FOUND", `No order with token ${tokenNumber} today`);
  if (order.status !== "READY") {
    apiError("INVALID_TRANSITION", `Token ${tokenNumber} is ${order.status.toLowerCase()}, not ready`, { status: order.status });
  }
  return applyTransition(actor, order.id, "COLLECTED", order.version);
}

// ---------------------------------------------------------------- reads

export async function getOrderView(viewer: { id: string; role: Role }, orderId: string): Promise<OrderView> {
  const o = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!o) apiError("NOT_FOUND", "Order not found");
  if (viewer.role === "STUDENT" && o.userId !== viewer.id) apiError("FORBIDDEN", "This isn't your order");
  let queue: OrderView["queue"] = null;
  if (o.status === "PLACED" || o.status === "PREPARING") {
    const [queued, settings] = await Promise.all([
      prisma.order.findMany({
        where: { businessDate: o.businessDate, status: { in: ["PLACED", "PREPARING"] } },
        select: { id: true, userId: true, createdAt: true },
      }),
      prisma.settings.findUnique({ where: { id: 1 } }),
    ]);
    const mine = queuePositions(queued, settings?.minutesPerOrder ?? 3).find((q) => q.orderId === o.id);
    if (mine) queue = { position: mine.position, etaMinutes: mine.etaMinutes };
  }
  return { order: toOrderDTO(o), queue };
}

/** Student's own orders: active first, then the last 30 days of history, 20 per page. */
export async function listMyOrders(userId: string, page = 1) {
  const pageSize = 20;
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [active, history, historyTotal] = await Promise.all([
    page === 1
      ? prisma.order.findMany({
          where: { userId, status: { in: ACTIVE_STATUSES } },
          include: orderInclude,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.order.findMany({
      where: { userId, status: { notIn: ACTIVE_STATUSES }, createdAt: { gte: since } },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where: { userId, status: { notIn: ACTIVE_STATUSES }, createdAt: { gte: since } } }),
  ]);
  return {
    active: active.map(toOrderDTO),
    history: history.map(toOrderDTO),
    page,
    hasMore: page * pageSize < historyTotal,
  };
}

/** Kitchen board: today's PLACED, PREPARING and READY orders, plus the last 20 closed. */
export async function getBoard() {
  const date = businessDate();
  const [open, done] = await Promise.all([
    prisma.order.findMany({
      where: { businessDate: date, status: { in: ACTIVE_STATUSES } },
      include: orderInclude,
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      where: { businessDate: date, status: { in: ["COLLECTED", "CANCELLED", "REJECTED"] } },
      include: orderInclude,
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);
  return { orders: open.map(toOrderDTO), done: done.map(toOrderDTO) };
}

export type { MenuItemDTO };
