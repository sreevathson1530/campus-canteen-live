import { Check, ChefHat, CircleSlash, Clock, PackageCheck, XCircle } from "lucide-react";
import type { OrderDTO, OrderStatus } from "@/lib/realtime/events";
import { formatClock } from "@/lib/time";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: "Placed",
  PREPARING: "Preparing",
  READY: "Ready",
  COLLECTED: "Collected",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

const CHIP: Record<OrderStatus, { cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  PLACED: { cls: "bg-secondary text-secondary-foreground", Icon: Clock },
  PREPARING: { cls: "bg-turmeric-soft text-[#7a5306] dark:text-turmeric", Icon: ChefHat },
  READY: { cls: "bg-leaf text-paper", Icon: PackageCheck },
  COLLECTED: { cls: "bg-leaf-soft text-leaf", Icon: Check },
  CANCELLED: { cls: "bg-muted text-muted-foreground", Icon: CircleSlash },
  REJECTED: { cls: "bg-chili-soft text-chili", Icon: XCircle },
};

/** Status chip: always icon + text, never colour alone. */
export function StatusChip({ status, className }: { status: OrderStatus; className?: string }) {
  const { cls, Icon } = CHIP[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", cls, className)}>
      <Icon className="size-3.5" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

const STEPS: { status: OrderStatus; at: keyof OrderDTO }[] = [
  { status: "PLACED", at: "createdAt" },
  { status: "PREPARING", at: "preparingAt" },
  { status: "READY", at: "readyAt" },
  { status: "COLLECTED", at: "collectedAt" },
];

const RANK: Partial<Record<OrderStatus, number>> = { PLACED: 0, PREPARING: 1, READY: 2, COLLECTED: 3 };

export function StatusStepper({ order }: { order: OrderDTO }) {
  const current = RANK[order.status] ?? -1;
  return (
    <ol className="relative grid grid-cols-4" aria-label="Order progress">
      <span aria-hidden className="absolute top-3.5 right-[12.5%] left-[12.5%] h-1 rounded-full bg-border" />
      <span
        aria-hidden
        className="absolute top-3.5 left-[12.5%] h-1 rounded-full bg-leaf transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(0, current) * 25}%` }}
      />
      {STEPS.map((s, i) => {
        const done = i < current || (i === current && order.status === "COLLECTED");
        const active = i === current && order.status !== "COLLECTED";
        const time = order[s.at] as string | null;
        return (
          <li key={s.status} className="relative flex flex-col items-center gap-1.5 text-center" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full border-4 border-background text-[11px] font-extrabold transition-colors",
                done ? "bg-leaf text-paper" : active ? "bg-turmeric text-[#3a2a05] ring-4 ring-turmeric-soft" : "bg-border text-muted-foreground",
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn("text-xs font-bold", i <= current ? "text-foreground" : "text-muted-foreground")}>{STATUS_LABEL[s.status]}</span>
            <span className="text-[11px] text-muted-foreground tabular">{time && i <= current ? formatClock(time) : " "}</span>
          </li>
        );
      })}
    </ol>
  );
}
