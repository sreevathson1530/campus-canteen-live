"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { History, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ClientApiError } from "@/lib/client-api";
import { applyOrderEvent, BOARD_KEY, type BoardData } from "@/lib/order-cache";
import type { OrderDTO, OrderStatus } from "@/lib/realtime/events";
import { formatClock } from "@/lib/time";
import { formatRupees } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useSound } from "@/hooks/useSound";
import { StatusChip } from "@/components/orders/StatusBits";
import { KitchenCard, NEXT } from "./KitchenCard";

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: "PLACED", label: "New" },
  { status: "PREPARING", label: "Preparing" },
  { status: "READY", label: "Ready" },
];

const QUICK_REASONS = ["Item ran out", "Kitchen closing", "Too busy right now"];

function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function KitchenBoard() {
  const qc = useQueryClient();
  const now = useNow();
  const { enabled: soundOn, enable: enableSound, play } = useSound();
  const { data, isLoading } = useQuery({ queryKey: BOARD_KEY, queryFn: () => api<BoardData>("/api/orders?scope=board") });
  const [tab, setTab] = useState<OrderStatus>("PLACED");
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<OrderDTO | null>(null);
  const [reason, setReason] = useState("");
  const [doneOpen, setDoneOpen] = useState(false);
  const [collectToken, setCollectToken] = useState("");
  const [collecting, setCollecting] = useState(false);
  const soundRef = useRef(soundOn);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  useSocketEvent("order:created", (o) => {
    applyOrderEvent(qc, o);
    setFlashIds((s) => new Set(s).add(o.id));
    setTimeout(() => setFlashIds((s) => {
      const n = new Set(s);
      n.delete(o.id);
      return n;
    }), 3000);
    if (soundRef.current) play("new-order");
  });
  useSocketEvent("order:updated", (o) => applyOrderEvent(qc, o));

  const byStatus = useMemo(() => {
    const m: Record<string, OrderDTO[]> = { PLACED: [], PREPARING: [], READY: [] };
    for (const o of data?.orders ?? []) m[o.status]?.push(o);
    return m;
  }, [data]);

  // Tab title shows how many new orders are waiting.
  const newCount = byStatus.PLACED.length;
  useEffect(() => {
    document.title = newCount > 0 ? `(${newCount}) New · Kitchen` : "Kitchen · Canteen";
    return () => {
      document.title = "Campus Canteen Live";
    };
  }, [newCount]);

  async function transition(order: OrderDTO, to: OrderStatus, rejectReason?: string) {
    const snapshot = qc.getQueryData<BoardData>(BOARD_KEY);
    // Optimistic: move the card now (same version, so the server's event still applies).
    qc.setQueryData<BoardData>(BOARD_KEY, (d) =>
      d
        ? {
            ...d,
            orders:
              to === "PREPARING" || to === "READY"
                ? d.orders.map((x) => (x.id === order.id ? { ...x, status: to } : x))
                : d.orders.filter((x) => x.id !== order.id),
          }
        : d,
    );
    setPending((s) => new Set(s).add(order.id));
    try {
      const { order: saved } = await api<{ order: OrderDTO }>(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        body: { to, expectedVersion: order.version, ...(rejectReason ? { reason: rejectReason } : {}) },
      });
      applyOrderEvent(qc, saved);
      if (to === "COLLECTED") toast.success(`Token ${saved.tokenNumber} collected · bill ${saved.billNumber}`);
    } catch (e) {
      qc.setQueryData(BOARD_KEY, snapshot);
      const err = e instanceof ClientApiError ? e : null;
      if (err?.code === "VERSION_CONFLICT") {
        if (err.details.order) applyOrderEvent(qc, err.details.order as OrderDTO);
        toast.warning("Already updated by another staff member");
      } else {
        toast.error(err?.message ?? "Couldn't update. Check your connection.");
      }
    } finally {
      setPending((s) => {
        const n = new Set(s);
        n.delete(order.id);
        return n;
      });
    }
  }

  async function collect(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = Number(collectToken);
    if (!Number.isInteger(token) || token < 1) return;
    setCollecting(true);
    try {
      const { order } = await api<{ order: OrderDTO }>("/api/orders/collect", { body: { tokenNumber: token } });
      applyOrderEvent(qc, order);
      toast.success(`Token ${order.tokenNumber} collected · ${formatRupees(order.totalPaise)}`);
      setCollectToken("");
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Couldn't collect");
    } finally {
      setCollecting(false);
    }
  }

  function renderColumn(status: OrderStatus) {
    const list = byStatus[status] ?? [];
    if (isLoading) return Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />);
    if (list.length === 0) {
      return <p className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">No orders here</p>;
    }
    return list.map((o) => (
      <KitchenCard
        key={o.id}
        order={o}
        now={now}
        flash={flashIds.has(o.id)}
        pending={pending.has(o.id)}
        onAdvance={() => NEXT[o.status] && transition(o, NEXT[o.status]!.to)}
        onReject={() => {
          setReason("");
          setRejecting(o);
        }}
      />
    ));
  }

  return (
    <div className="grid gap-4 pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-display text-3xl font-extrabold">Kitchen</h1>
        <Button variant="outline" className="h-10 rounded-full" onClick={() => setDoneOpen(true)}>
          <History /> Done today
        </Button>
        {soundOn ? (
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-leaf-soft px-3 text-sm font-semibold text-leaf">
            <Volume2 className="size-4" /> Sound on
          </span>
        ) : (
          <Button className="h-10 rounded-full bg-turmeric px-4 text-[#3a2a05] hover:bg-turmeric/90" onClick={enableSound}>
            <VolumeX /> Enable sound
          </Button>
        )}
      </div>

      {/* Collect box, pinned under the header on phones */}
      <form
        onSubmit={collect}
        className="sticky top-[calc(env(safe-area-inset-top)+3.75rem)] z-20 flex gap-2 rounded-3xl border bg-card/95 p-2 shadow-sm backdrop-blur"
        aria-label="Collect an order by token"
      >
        <Input
          value={collectToken}
          onChange={(e) => setCollectToken(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="Token to collect, e.g. 107"
          className="h-12 flex-1 rounded-2xl border-0 bg-secondary text-lg font-bold tabular"
          aria-label="Token number"
        />
        <Button type="submit" size="xl" disabled={!collectToken || collecting} className="bg-foreground text-background hover:bg-foreground/90">
          Collect
        </Button>
      </form>

      {/* Phone: tabs with live counts */}
      <div role="tablist" aria-label="Order status" className="grid grid-cols-3 gap-1.5 rounded-2xl bg-secondary p-1.5 md:hidden">
        {COLUMNS.map((c) => (
          <button
            key={c.status}
            role="tab"
            aria-selected={tab === c.status}
            onClick={() => setTab(c.status)}
            className={cn(
              "flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-colors",
              tab === c.status ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            {c.label}
            <span
              className={cn(
                "grid min-w-6 place-items-center rounded-full px-1.5 text-xs tabular",
                c.status === "PLACED" && byStatus.PLACED.length > 0 ? "bg-turmeric text-[#3a2a05]" : "bg-muted",
              )}
            >
              {byStatus[c.status]?.length ?? 0}
            </span>
          </button>
        ))}
      </div>
      <div role="tabpanel" className="grid gap-3 md:hidden">
        {renderColumn(tab)}
      </div>

      {/* Tablet and up: three columns */}
      <div className="hidden gap-4 md:grid md:grid-cols-3">
        {COLUMNS.map((c) => (
          <section key={c.status} aria-label={c.label} className="grid content-start gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
              {c.label}
              <span className="rounded-full bg-secondary px-2 text-sm tabular">{byStatus[c.status]?.length ?? 0}</span>
            </h2>
            {renderColumn(c.status)}
          </section>
        ))}
      </div>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Reject token {rejecting?.tokenNumber}?</DialogTitle>
            <DialogDescription>The student sees your reason. Any limited stock is returned.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", reason === r && "border-chili bg-chili-soft text-chili")}
              >
                {r}
              </button>
            ))}
          </div>
          <Input value={reason} onChange={(e) => setReason(e.target.value.slice(0, 140))} placeholder="Or type a reason" className="h-11 rounded-xl" />
          <DialogFooter className="gap-2">
            <Button variant="outline" size="xl" onClick={() => setRejecting(null)}>
              Keep
            </Button>
            <Button
              size="xl"
              className="bg-chili text-white hover:bg-chili/90"
              disabled={reason.trim().length < 3}
              onClick={() => {
                if (rejecting) void transition(rejecting, "REJECTED", reason.trim());
                setRejecting(null);
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={doneOpen} onOpenChange={setDoneOpen}>
        <DrawerContent className="mx-auto max-h-[85dvh] max-w-lg">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-display text-2xl font-extrabold">Done today</DrawerTitle>
            <DrawerDescription>The last 20 collected, cancelled and rejected orders.</DrawerDescription>
          </DrawerHeader>
          <ul className="grid gap-2 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
            {(data?.done ?? []).length === 0 && <li className="p-6 text-center text-muted-foreground">Nothing yet today.</li>}
            {(data?.done ?? []).map((o) => (
              <li key={o.id} className="flex items-center gap-3 rounded-2xl border p-3">
                <span className="font-display text-2xl font-extrabold tabular">{o.tokenNumber}</span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-semibold">{o.studentFirstName}</span>
                  <span className="block truncate text-muted-foreground">
                    {formatClock(o.collectedAt ?? o.closedAt ?? o.createdAt)} · {formatRupees(o.totalPaise)}
                    {o.rejectReason ? ` · ${o.rejectReason}` : ""}
                  </span>
                </span>
                <StatusChip status={o.status} />
              </li>
            ))}
          </ul>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
