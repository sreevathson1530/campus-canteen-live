"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CalendarRange, ChevronDown, IndianRupee, Mail, MailCheck, Phone, Search, StickyNote, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ClientApiError } from "@/lib/client-api";
import { formatRupees } from "@/lib/money";
import { formatClock, formatDateTime } from "@/lib/time";
import type { OrderStatus } from "@/lib/realtime/events";
import type { AdminOrderDTO, Earnings, OrderRange } from "@/lib/orders/admin";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { STATUS_LABEL, StatusChip, StatusStepper } from "@/components/orders/StatusBits";
import { cn } from "@/lib/utils";

interface OrdersPage {
  range: OrderRange;
  page: number;
  total: number;
  hasMore: boolean;
  statusCounts: Record<OrderStatus, number>;
  orders: AdminOrderDTO[];
  earnings: { today: string; day: Earnings; week: Earnings; month: Earnings };
}

const RANGES: { key: OrderRange; label: string }[] = [
  { key: "active", label: "Current" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All" },
];
const STATUSES: OrderStatus[] = ["PLACED", "PREPARING", "READY", "COLLECTED", "CANCELLED", "REJECTED"];
const ACTIVE: OrderStatus[] = ["PLACED", "PREPARING", "READY"];

export function OrdersAdmin() {
  const qc = useQueryClient();
  const [range, setRange] = useState<OrderRange>("active");
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q.trim());
  const [open, setOpen] = useState<string | null>(null);

  const key = ["admin-orders", range, status, dq] as const;
  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) =>
      api<OrdersPage>(`/api/admin/orders?range=${range}&status=${status ?? ""}&q=${encodeURIComponent(dq)}&page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

  // Any order change anywhere refreshes the list and the earnings (coalesced to one refetch per 600 ms).
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = () => {
    if (pending.current) return;
    pending.current = setTimeout(() => {
      pending.current = null;
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    }, 600);
  };
  useSocketEvent("order:created", refresh);
  useSocketEvent("order:updated", refresh);

  const first = query.data?.pages[0];
  const orders = query.data?.pages.flatMap((p) => p.orders) ?? [];
  const statusChoices = range === "active" ? ACTIVE : STATUSES;

  return (
    <div className="grid gap-5 pb-6">
      <div>
        <p className="text-sm font-semibold text-muted-foreground">Every order, live</p>
        <h1 className="font-display text-3xl font-extrabold">Orders</h1>
      </div>

      {/* Earnings */}
      <section aria-label="Earnings" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <EarningCard icon={IndianRupee} label="Today" e={first?.earnings.day} tone="leaf" />
        <EarningCard icon={CalendarRange} label="This week" hint="Since Monday" e={first?.earnings.week} />
        <EarningCard icon={CalendarDays} label="This month" e={first?.earnings.month} />
      </section>

      {/* Range */}
      <div role="tablist" aria-label="Which orders" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={range === r.key}
            onClick={() => {
              setRange(r.key);
              setStatus(null);
              setOpen(null);
            }}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors",
              range === r.key ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground hover:bg-muted",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Search + status */}
      <div className="grid gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Token, name, email, phone or bill no."
            className="h-12 rounded-2xl pl-9"
            aria-label="Search orders"
          />
        </div>
        <div role="group" aria-label="Filter by status" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          <FilterChip on={status === null} onClick={() => setStatus(null)} label="All" count={first ? statusChoices.reduce((n, s) => n + first.statusCounts[s], 0) : undefined} />
          {statusChoices.map((s) => (
            <FilterChip key={s} on={status === s} onClick={() => setStatus(status === s ? null : s)} label={STATUS_LABEL[s]} count={first?.statusCounts[s]} />
          ))}
        </div>
      </div>

      {/* List */}
      {query.isLoading ? (
        <div className="grid gap-2.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-3xl border p-6 text-center">
          <p className="font-semibold">Couldn&apos;t load orders.</p>
          <button className="mt-2 font-semibold text-leaf" onClick={() => query.refetch()}>
            Try again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-10 text-center">
          <p className="font-bold">{range === "active" ? "No current orders" : "No orders here"}</p>
          <p className="text-sm text-muted-foreground">{dq || status ? "Try another search or filter." : "New orders appear here instantly."}</p>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
            {first?.total} {first?.total === 1 ? "order" : "orders"}
          </p>
          <ul className="grid gap-2.5">
            {orders.map((o) => (
              <OrderRow key={o.id} o={o} today={first?.earnings.today ?? ""} open={open === o.id} onToggle={() => setOpen(open === o.id ? null : o.id)} />
            ))}
          </ul>
          {query.hasNextPage && (
            <Button variant="outline" size="xl" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
              {query.isFetchingNextPage ? "Loading…" : "Show more"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function EarningCard({ icon: Icon, label, hint, e, tone }: { icon: typeof IndianRupee; label: string; hint?: string; e?: Earnings; tone?: "leaf" }) {
  return (
    <div className={cn("min-w-0 rounded-3xl border p-4", tone === "leaf" ? "col-span-2 border-leaf bg-leaf text-paper sm:col-span-1" : "bg-card")}>
      <div className={cn("flex items-center gap-2 text-sm font-semibold", tone === "leaf" ? "text-paper/85" : "text-muted-foreground")}>
        <Icon className="size-4" /> {label}
        {hint && <span className="ml-auto hidden text-xs font-medium opacity-80 lg:inline">{hint}</span>}
      </div>
      {e ? (
        <>
          <p className="mt-2 truncate font-display text-2xl font-extrabold tabular sm:text-3xl">{formatRupees(e.revenuePaise)}</p>
          <p className={cn("text-xs", tone === "leaf" ? "text-paper/80" : "text-muted-foreground")}>
            {e.orders} collected {e.orders === 1 ? "order" : "orders"}
          </p>
        </>
      ) : (
        <Skeleton className="mt-2 h-10 w-32 rounded-xl" />
      )}
    </div>
  );
}

function FilterChip({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
        on ? "border-leaf bg-leaf text-paper" : "bg-card hover:bg-muted",
      )}
    >
      {label}
      {count !== undefined && <span className={cn("tabular", on ? "opacity-80" : "text-muted-foreground")}>{count}</span>}
    </button>
  );
}

function OrderRow({ o, today, open, onToggle }: { o: AdminOrderDTO; today: string; open: boolean; onToggle: () => void }) {
  const when = o.businessDate === today ? formatClock(o.createdAt) : formatDateTime(o.createdAt);
  return (
    <li className={cn("overflow-hidden rounded-3xl border bg-card transition-shadow", open && "shadow-lg shadow-black/5")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 p-3.5 text-left hover:bg-muted/40">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-secondary font-display text-xl font-extrabold tabular">{o.tokenNumber}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-bold">{o.student.name}</span>
            <StatusChip status={o.status} className="shrink-0" />
          </span>
          <span className="block truncate text-sm text-muted-foreground">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span>
          <span className="block text-xs text-muted-foreground">
            {when} · <b className="text-foreground tabular">{formatRupees(o.totalPaise)}</b>
          </span>
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <OrderDetails o={o} />}
    </li>
  );
}

function OrderDetails({ o }: { o: AdminOrderDTO }) {
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    try {
      const r = await api<{ to: string }>(`/api/admin/orders/${o.id}/email-bill`, { method: "POST" });
      toast.success(`Bill emailed to ${r.to}`);
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Couldn't send the bill");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4 border-t px-4 pt-4 pb-5">
      {o.status === "CANCELLED" || o.status === "REJECTED" ? (
        <p className={cn("flex items-start gap-2 rounded-2xl p-3 text-sm font-semibold", o.status === "REJECTED" ? "bg-chili-soft text-chili" : "bg-muted text-muted-foreground")}>
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {o.status === "REJECTED" ? `Rejected by the kitchen: ${o.rejectReason ?? "no reason"}` : "Cancelled by the student"}
          {o.closedAt && <span className="ml-auto shrink-0 font-normal tabular">{formatClock(o.closedAt)}</span>}
        </p>
      ) : (
        <StatusStepper order={o} />
      )}

      {/* Student */}
      <div className="grid gap-1.5 rounded-2xl bg-muted/50 p-3 text-sm">
        <p className="font-bold">{o.student.name}</p>
        <a href={`mailto:${o.student.email}`} className="flex items-center gap-2 break-all text-leaf hover:underline">
          <Mail className="size-4 shrink-0" /> {o.student.email}
        </a>
        {o.student.phone && (
          <a href={`tel:${o.student.phone}`} className="flex items-center gap-2 text-leaf hover:underline">
            <Phone className="size-4 shrink-0" /> {o.student.phone.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2")}
          </a>
        )}
      </div>

      {/* Items */}
      <div>
        <ul className="divide-y text-sm">
          {o.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span>
                <b className="tabular">{it.quantity} ×</b> {it.name} <span className="text-muted-foreground">@ {formatRupees(it.unitPricePaise)}</span>
              </span>
              <span className="font-semibold tabular">{formatRupees(it.unitPricePaise * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-1 flex items-baseline justify-between border-t pt-2">
          <span className="font-semibold text-muted-foreground">Total</span>
          <span className="font-display text-xl font-extrabold tabular">{formatRupees(o.totalPaise)}</span>
        </div>
      </div>

      {o.note && (
        <p className="flex items-start gap-2 rounded-2xl bg-turmeric-soft px-3 py-2 text-sm font-semibold text-[#5e4105] dark:text-turmeric">
          <StickyNote className="mt-0.5 size-4 shrink-0" /> {o.note}
        </p>
      )}

      <p className="text-xs text-muted-foreground">Placed {formatDateTime(o.createdAt)}</p>

      {/* Bill */}
      {o.bill ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Bill</p>
            <p className="font-mono text-sm font-semibold">{o.bill.billNumber}</p>
            <p className={cn("mt-0.5 flex items-center gap-1.5 text-xs font-semibold", o.bill.emailedAt ? "text-leaf" : "text-muted-foreground")}>
              {o.bill.emailedAt ? (
                <>
                  <MailCheck className="size-3.5" /> Emailed {formatDateTime(o.bill.emailedAt)}
                </>
              ) : (
                <>
                  <Mail className="size-3.5" /> Not emailed yet
                </>
              )}
            </p>
          </div>
          <Button variant="outline" className="h-10 rounded-full" onClick={resend} disabled={sending}>
            <Mail /> {sending ? "Sending…" : o.bill.emailedAt ? "Resend bill" : "Email bill"}
          </Button>
        </div>
      ) : (
        o.status !== "CANCELLED" &&
        o.status !== "REJECTED" && <p className="text-xs text-muted-foreground">The bill is created and emailed to the student when the order is collected.</p>
      )}
    </div>
  );
}
