"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, BellRing, ChevronLeft, Receipt, RotateCcw } from "lucide-react";
import { useOrderAgain } from "@/hooks/useOrderAgain";
import { CookingCard } from "./CookingCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ClientApiError } from "@/lib/client-api";
import { formatRupees } from "@/lib/money";
import { applyOrderEvent, orderKey, type OrderViewData } from "@/lib/order-cache";
import type { OrderDTO, OrderStatus } from "@/lib/realtime/events";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { playSound } from "@/hooks/useSound";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, StatusChip, StatusStepper } from "./StatusBits";

const ANNOUNCE: Record<OrderStatus, (t: number) => string> = {
  PLACED: (t) => `Order ${t} placed.`,
  PREPARING: (t) => `Order ${t} is being prepared.`,
  READY: (t) => `Order ${t} is ready. Show token ${t} at the counter.`,
  COLLECTED: (t) => `Order ${t} collected. Enjoy your food.`,
  CANCELLED: (t) => `Order ${t} was cancelled.`,
  REJECTED: (t) => `Order ${t} was rejected by the kitchen.`,
};

function notifyReady(order: OrderDTO) {
  playSound("chime");
  if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200, 100, 400]);
  if (document.hidden && "Notification" in window && Notification.permission === "granted") {
    new Notification(`Token ${order.tokenNumber} is ready`, { body: "Show your token at the counter.", tag: `ready-${order.id}` });
  }
}

export function OrderTracker({ id }: { id: string }) {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: orderKey(id),
    queryFn: () => api<OrderViewData>(`/api/orders/${id}`),
  });
  const [announce, setAnnounce] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );
  const lastStatus = useRef<OrderStatus | null>(null);
  const { orderAgain, busy: againBusy } = useOrderAgain();

  useSocketEvent("order:updated", (o) => {
    if (o.id === id) applyOrderEvent(qc, o);
  });
  useSocketEvent("queue:update", (q) => {
    if (q.orderId !== id) return;
    qc.setQueryData<OrderViewData>(orderKey(id), (d) =>
      d && (d.order.status === "PLACED" || d.order.status === "PREPARING") ? { ...d, queue: { position: q.position, etaMinutes: q.etaMinutes } } : d,
    );
  });

  // React to status changes, whether from a socket event or a refetch after reconnect.
  const order = data?.order;
  useEffect(() => {
    if (!order) return;
    const prev = lastStatus.current;
    lastStatus.current = order.status;
    if (prev === null || prev === order.status) return;
    setAnnounce(ANNOUNCE[order.status](order.tokenNumber));
    if (order.status === "READY") notifyReady(order);
    if (order.status === "REJECTED") playSound("error");
  }, [order]);

  async function cancel() {
    if (!order) return;
    setCancelling(true);
    try {
      const { order: o } = await api<{ order: OrderDTO }>(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        body: { to: "CANCELLED", expectedVersion: order.version },
      });
      applyOrderEvent(qc, o);
      setConfirmCancel(false);
      toast.success("Order cancelled");
    } catch (e) {
      const err = e instanceof ClientApiError ? e : null;
      if (err?.code === "VERSION_CONFLICT" && err.details.order) applyOrderEvent(qc, err.details.order as OrderDTO);
      toast.error(err?.code === "VERSION_CONFLICT" ? "The kitchen already started this order" : err?.message ?? "Couldn't cancel");
      setConfirmCancel(false);
    } finally {
      setCancelling(false);
    }
  }

  async function askNotify() {
    if (!("Notification" in window)) return;
    setNotifPerm(await Notification.requestPermission());
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }
  if (isError || !order) {
    return (
      <div className="rounded-3xl border p-8 text-center">
        <p className="font-semibold">{error instanceof ClientApiError ? error.message : "Couldn't load this order."}</p>
        <Link href="/orders" className="mt-3 inline-block font-semibold text-leaf">
          Back to my orders
        </Link>
      </div>
    );
  }

  const queue = data.queue;
  const ready = order.status === "READY";

  return (
    <div className="grid gap-4 pb-6">
      <div aria-live="assertive" className="sr-only">
        {announce}
      </div>

      <Link href="/orders" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> My orders
      </Link>

      {ready ? (
        <section className="relative flex flex-col items-center overflow-hidden rounded-[2rem] bg-leaf px-6 py-10 text-center text-paper">
          <p className="text-xs font-bold tracking-[0.2em] uppercase opacity-85">Ready for pickup</p>
          <div className="mt-6 grid size-40 animate-pulse-ring place-items-center rounded-full border-4 border-paper/30 motion-reduce:animate-none">
            <span className="font-display text-6xl font-extrabold tabular">{order.tokenNumber}</span>
          </div>
          <h1 className="mt-6 font-display text-2xl leading-tight font-extrabold">
            Ready, show token {order.tokenNumber}
            <br />
            at the counter
          </h1>
          <p className="mt-2 text-sm opacity-85">Pay {formatRupees(order.totalPaise)} by cash or UPI when you collect.</p>
        </section>
      ) : (
        <section className="rounded-[2rem] border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">Token</p>
              <p className="font-display text-7xl leading-none font-extrabold tabular">{order.tokenNumber}</p>
            </div>
            <StatusChip status={order.status} />
          </div>
          {order.status !== "CANCELLED" && order.status !== "REJECTED" && (
            <div className="mt-6">
              <StatusStepper order={order} />
            </div>
          )}
          {order.status === "REJECTED" && (
            <div className="mt-5 rounded-2xl bg-chili-soft p-4 text-chili">
              <p className="font-bold">The kitchen couldn&apos;t make this order</p>
              <p className="text-sm">Reason: {order.rejectReason}</p>
              <p className="mt-1 text-sm font-semibold">You have not been charged.</p>
            </div>
          )}
          {order.status === "CANCELLED" && (
            <p className="mt-5 rounded-2xl bg-muted p-4 font-semibold text-muted-foreground">You cancelled this order. You have not been charged.</p>
          )}
          {order.status === "COLLECTED" && (
            <Button asChild size="xl" variant="outline" className="mt-5 w-full">
              <Link href={`/orders/${order.id}/bill`}>
                <Receipt /> View bill {order.billNumber && <span className="text-muted-foreground">· {order.billNumber}</span>}
              </Link>
            </Button>
          )}
        </section>
      )}

      {(order.status === "PLACED" || order.status === "PREPARING") && <CookingCard order={order} queue={queue} />}

      {(order.status === "PLACED" || order.status === "PREPARING") && notifPerm === "default" && (
        <button
          type="button"
          onClick={askNotify}
          className="flex items-center gap-3 rounded-3xl border border-dashed p-4 text-left text-sm font-semibold hover:bg-muted"
        >
          <Bell className="size-5 text-leaf" /> Notify me when it&apos;s ready, even if I switch apps
        </button>
      )}
      {notifPerm === "granted" && (order.status === "PLACED" || order.status === "PREPARING") && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <BellRing className="size-4 text-leaf" /> We&apos;ll notify you when it&apos;s ready.
        </p>
      )}

      <section className="rounded-3xl border bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-extrabold">Your order</h2>
        <ul className="divide-y">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between py-2">
              <span>
                <b className="tabular">{it.quantity} ×</b> {it.name}
              </span>
              <span className="font-semibold tabular">{formatRupees(it.unitPricePaise * it.quantity)}</span>
            </li>
          ))}
        </ul>
        {order.note && <p className="mt-3 rounded-xl bg-turmeric-soft px-3 py-2 text-sm font-semibold text-[#5e4105] dark:text-turmeric">Note: {order.note}</p>}
        <div className="mt-3 flex items-baseline justify-between border-t pt-3">
          <span className="font-semibold text-muted-foreground">Total · pay at counter</span>
          <span className="font-display text-2xl font-extrabold tabular">{formatRupees(order.totalPaise)}</span>
        </div>
      </section>

      {(order.status === "COLLECTED" || order.status === "CANCELLED" || order.status === "REJECTED") && (
        <Button size="xl" onClick={() => orderAgain(order)} disabled={againBusy}>
          <RotateCcw /> Order this again
        </Button>
      )}

      {order.status === "PLACED" && (
        <Button variant="ghost" className="h-11 font-semibold text-chili hover:bg-chili-soft hover:text-chili" onClick={() => setConfirmCancel(true)}>
          Cancel order
        </Button>
      )}

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Cancel token {order.tokenNumber}?</DialogTitle>
            <DialogDescription>The kitchen hasn&apos;t started it yet. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="xl" onClick={() => setConfirmCancel(false)}>
              Keep order
            </Button>
            <Button size="xl" className={cn("bg-chili text-white hover:bg-chili/90")} onClick={cancel} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Yes, cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="sr-only">Current status: {STATUS_LABEL[order.status]}</p>
    </div>
  );
}
