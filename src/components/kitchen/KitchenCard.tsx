import { MoreHorizontal, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { OrderDTO, OrderStatus } from "@/lib/realtime/events";
import { formatRupees } from "@/lib/money";
import { cn } from "@/lib/utils";

export const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  PLACED: { to: "PREPARING", label: "Start" },
  PREPARING: { to: "READY", label: "Ready" },
  READY: { to: "COLLECTED", label: "Collected" },
};

function since(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${String(s).padStart(2, "0")}`;
}

/** Neutral under 10 minutes, amber from 10 to 20, red after 20 (text label too, not colour alone). */
function timerTone(sec: number) {
  if (sec >= 20 * 60) return { cls: "bg-chili-soft text-chili", label: "late" };
  if (sec >= 10 * 60) return { cls: "bg-turmeric-soft text-[#7a5306] dark:text-turmeric", label: "slow" };
  return { cls: "bg-secondary text-secondary-foreground", label: "" };
}

export function KitchenCard({
  order,
  now,
  flash,
  pending,
  onAdvance,
  onReject,
}: {
  order: OrderDTO;
  now: number;
  flash: boolean;
  pending: boolean;
  onAdvance: () => void;
  onReject: () => void;
}) {
  const elapsed = since(order.createdAt, now);
  const tone = timerTone(elapsed);
  const next = NEXT[order.status];
  const uncollected = order.status === "READY" && order.readyAt && since(order.readyAt, now) > 15 * 60;

  return (
    <article
      className={cn(
        "rounded-3xl border bg-card p-4 shadow-sm transition-all",
        flash && "animate-flash border-turmeric",
        pending && "opacity-70",
      )}
      aria-label={`Token ${order.tokenNumber}, ${order.studentFirstName}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl leading-none font-extrabold tabular">{order.tokenNumber}</span>
          <span className="font-semibold">{order.studentFirstName}</span>
        </div>
        <span className={cn("rounded-lg px-2 py-1 font-mono text-xs font-bold tabular", tone.cls)} title="Time since ordered">
          {fmt(elapsed)}
          {tone.label && <span className="sr-only"> ({tone.label})</span>}
        </span>
      </div>

      {uncollected && (
        <span className="mt-2 inline-block rounded-full bg-chili-soft px-2 py-0.5 text-[11px] font-bold text-chili">Uncollected 15+ min</span>
      )}

      <ul className="mt-3 grid gap-1">
        {order.items.map((i, idx) => (
          <li key={idx} className="flex gap-2 text-[15px]">
            <b className="w-7 shrink-0 text-right tabular">{i.quantity}×</b>
            <span>{i.name}</span>
          </li>
        ))}
      </ul>

      {order.note && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-turmeric-soft px-3 py-2 text-sm font-semibold text-[#5e4105] dark:text-turmeric">
          <StickyNote className="mt-0.5 size-4 shrink-0" /> {order.note}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <span className="mr-auto text-sm font-semibold text-muted-foreground tabular">{formatRupees(order.totalPaise)}</span>
        {(order.status === "PLACED" || order.status === "PREPARING") && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="size-11 rounded-2xl" aria-label={`More actions for token ${order.tokenNumber}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-chili" onSelect={onReject}>
                Reject order…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {next && (
          <Button
            size="xl"
            onClick={onAdvance}
            disabled={pending}
            className={cn(
              "min-w-32",
              order.status === "PLACED" && "bg-turmeric text-[#3a2a05] hover:bg-turmeric/90",
              order.status === "READY" && "bg-foreground text-background hover:bg-foreground/90",
            )}
          >
            {next.label}
          </Button>
        )}
      </div>
    </article>
  );
}
