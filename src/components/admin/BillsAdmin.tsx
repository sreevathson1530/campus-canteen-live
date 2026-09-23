"use client";

import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { api } from "@/lib/client-api";
import type { BillDTO } from "@/lib/bills/service";
import { formatRupees } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { BillView } from "@/components/orders/BillView";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useQueryClient } from "@tanstack/react-query";

export function BillsAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDeferredValue(q);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-bills", dq, date, page],
    queryFn: () => api<{ bills: BillDTO[]; total: number; pageSize: number }>(`/api/admin/bills?q=${encodeURIComponent(dq)}&date=${date}&page=${page}`),
  });
  const [open, setOpen] = useState<BillDTO | null>(null);

  // A new bill appears the moment an order is collected.
  useSocketEvent("order:updated", (o) => {
    if (o.status === "COLLECTED") void qc.invalidateQueries({ queryKey: ["admin-bills"] });
  });

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="grid gap-4 pb-6">
      <h1 className="font-display text-3xl font-extrabold">Bills</h1>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Bill no., name or phone"
            className="h-12 rounded-2xl pl-9"
            aria-label="Search bills"
          />
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(1);
          }}
          className="h-12 rounded-2xl"
          aria-label="Filter by date"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : data && data.bills.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
          <Receipt className="size-8" />
          No bills yet. A bill is created when an order is collected.
        </div>
      ) : (
        <ul className="grid gap-2">
          {data?.bills.map((b) => (
            <li key={b.billNumber}>
              <button type="button" onClick={() => setOpen(b)} className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left hover:bg-muted/60">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary font-display text-lg font-extrabold tabular">{b.tokenNumber}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{b.studentName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {b.billNumber} · {formatDateTime(b.collectedAt)}
                  </span>
                </span>
                <span className="font-display text-lg font-extrabold tabular">{formatRupees(b.totalPaise)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
            Previous
          </Button>
          <span className="text-sm tabular">
            {page} / {pages}
          </span>
          <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page >= pages}>
            Next
          </Button>
        </div>
      )}

      <Drawer open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DrawerContent className="mx-auto max-h-[92dvh] max-w-lg">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Bill {open?.billNumber}</DrawerTitle>
            <DrawerDescription>Bill details</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pt-2 pb-[max(env(safe-area-inset-bottom),1.25rem)]">{open && <BillView bill={open} />}</div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
