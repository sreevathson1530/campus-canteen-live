"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { OrderDTO } from "./realtime/events";

export const orderKey = (id: string) => ["order", id] as const;
export const MY_ORDERS_KEY = ["my-orders"] as const;
export const BOARD_KEY = ["board"] as const;

export interface OrderViewData {
  order: OrderDTO;
  queue: { position: number; etaMinutes: number } | null;
}

export interface MyOrdersData {
  active: OrderDTO[];
  history: OrderDTO[];
  page: number;
  hasMore: boolean;
}

export interface BoardData {
  orders: OrderDTO[];
  done: OrderDTO[];
}

const ACTIVE = new Set(["PLACED", "PREPARING", "READY"]);

/** Rule 5: an event is applied only if its version is newer than the cached one. */
export function isNewer(incoming: OrderDTO, cached: OrderDTO | undefined): boolean {
  return !cached || incoming.version > cached.version;
}

/** Page 1 of My orders: moves the order between Active and history as its status changes. */
export function patchMyOrders(d: MyOrdersData, o: OrderDTO): MyOrdersData {
  const cached = [...d.active, ...d.history].find((x) => x.id === o.id);
  if (!isNewer(o, cached)) return d;
  const active = d.active.filter((x) => x.id !== o.id);
  const history = d.history.filter((x) => x.id !== o.id);
  if (ACTIVE.has(o.status)) active.unshift(o);
  else history.unshift(o);
  active.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { ...d, active, history };
}

function patchHistory(d: MyOrdersData, o: OrderDTO): MyOrdersData {
  return { ...d, history: d.history.map((h) => (h.id === o.id && isNewer(o, h) ? o : h)) };
}

/** Patches every cache that can hold this order. Stale or out-of-order events are dropped. */
export function applyOrderEvent(qc: QueryClient, o: OrderDTO): void {
  qc.setQueryData<OrderViewData>(orderKey(o.id), (d) => {
    if (!d || !isNewer(o, d.order)) return d;
    return { order: o, queue: ACTIVE.has(o.status) && o.status !== "READY" ? d.queue : null };
  });

  qc.setQueryData<{ pages: MyOrdersData[]; pageParams: unknown[] }>(MY_ORDERS_KEY, (d) =>
    d ? { ...d, pages: d.pages.map((p, i) => (i === 0 ? patchMyOrders(p, o) : patchHistory(p, o))) } : d,
  );

  qc.setQueryData<BoardData>(BOARD_KEY, (d) => {
    if (!d) return d;
    const cached = [...d.orders, ...d.done].find((x) => x.id === o.id);
    if (!isNewer(o, cached)) return d;
    const orders = d.orders.filter((x) => x.id !== o.id);
    let done = d.done.filter((x) => x.id !== o.id);
    if (ACTIVE.has(o.status)) {
      orders.push(o);
      orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else {
      done = [o, ...done].slice(0, 20);
    }
    return { orders, done };
  });
}
