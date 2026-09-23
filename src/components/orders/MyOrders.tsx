"use client";

import Link from "next/link";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/client-api";
import { formatRupees } from "@/lib/money";
import { applyOrderEvent, MY_ORDERS_KEY, type MyOrdersData } from "@/lib/order-cache";
import type { OrderDTO } from "@/lib/realtime/events";
import { formatDateTime } from "@/lib/time";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { StatusChip } from "./StatusBits";

function OrderRow({ o }: { o: OrderDTO }) {
  return (
    <Link href={`/orders/${o.id}`} className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 transition-colors hover:bg-muted/60">
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-secondary font-display text-xl font-extrabold tabular">{o.tokenNumber}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span>
        <span className="block text-xs text-muted-foreground">
          {formatDateTime(o.createdAt)} · {formatRupees(o.totalPaise)}
        </span>
      </span>
      <StatusChip status={o.status} />
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

/** Active orders first with live chips, then the last 30 days, 20 per page. */
export function MyOrders() {
  const qc = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: MY_ORDERS_KEY,
    queryFn: ({ pageParam }) => api<MyOrdersData>(`/api/orders?scope=mine&page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
  useSocketEvent("order:updated", (o) => applyOrderEvent(qc, o));

  if (q.isLoading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  const active = q.data?.pages[0]?.active ?? [];
  const history = q.data?.pages.flatMap((p) => p.history) ?? [];

  return (
    <div className="grid gap-6 pb-6">
      <h1 className="font-display text-3xl font-extrabold">My orders</h1>

      {active.length === 0 && history.length === 0 && (
        <div className="grid place-items-center gap-3 rounded-3xl border border-dashed p-10 text-center">
          <UtensilsCrossed className="size-8 text-muted-foreground" />
          <p className="font-semibold">No orders yet</p>
          <Button asChild size="xl">
            <Link href="/menu">Browse the menu</Link>
          </Button>
        </div>
      )}

      {active.length > 0 && (
        <section className="grid gap-2.5">
          <h2 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">Active</h2>
          {active.map((o) => (
            <OrderRow key={o.id} o={o} />
          ))}
        </section>
      )}

      {history.length > 0 && (
        <section className="grid gap-2.5">
          <h2 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">Last 30 days</h2>
          {history.map((o) => (
            <OrderRow key={o.id} o={o} />
          ))}
          {q.hasNextPage && (
            <Button variant="outline" size="xl" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
              {q.isFetchingNextPage ? "Loading…" : "Show more"}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
