"use client";

import { useEffect, useState } from "react";
import { ChefHat, Timer } from "lucide-react";
import type { OrderDTO } from "@/lib/realtime/events";
import { formatClock } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * Live "being cooked" card: a steaming pot, a "ready by" clock time and a progress bar.
 * The estimate is anchored when the ETA arrives (not recomputed on every render), and the bar
 * advances every 15 s. It never claims 100 %: the order only turns Ready when the kitchen says so.
 */
export function CookingCard({ order, queue }: { order: OrderDTO; queue: { position: number; etaMinutes: number } | null }) {
  const [now, setNow] = useState(() => Date.now());
  const [anchor, setAnchor] = useState<{ eta: number; at: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  // Re-anchor the "ready by" time only when the kitchen's estimate changes (to within one 15 s tick).
  const eta = queue?.etaMinutes ?? null;
  if (eta !== null && anchor?.eta !== eta) setAnchor({ eta, at: now });

  const readyAt = anchor ? anchor.at + anchor.eta * 60_000 : null;
  const start = new Date(order.createdAt).getTime();
  const span = readyAt ? Math.max(readyAt - start, 60_000) : null;
  const pct = span ? Math.min(92, Math.max(6, ((now - start) / span) * 100)) : 10;
  const minsLeft = readyAt ? Math.max(1, Math.ceil((readyAt - now) / 60_000)) : null;
  const preparing = order.status === "PREPARING";

  return (
    <section
      aria-live="polite"
      className={cn(
        "overflow-hidden rounded-3xl p-5",
        preparing ? "bg-turmeric-soft text-[#5e4105] dark:text-turmeric" : "bg-secondary text-foreground",
      )}
    >
      <div className="flex items-center gap-4">
        <Pot active={preparing} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-[0.16em] uppercase opacity-80">{preparing ? "Cooking now" : "In the queue"}</p>
          {readyAt ? (
            <p className="font-display text-[1.65rem] leading-tight font-extrabold whitespace-nowrap">
              Ready by <span className="tabular">{formatClock(new Date(readyAt))}</span>
            </p>
          ) : (
            <p className="font-display text-2xl leading-tight font-extrabold">{preparing ? "On the stove" : "Waiting for the kitchen"}</p>
          )}
          {queue && (
            <p className="mt-0.5 text-sm font-semibold opacity-85">
              #{queue.position} in the queue · about {minsLeft ?? queue.etaMinutes} min left
            </p>
          )}
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Estimated progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="mt-4 h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-1000 ease-out", preparing ? "bg-turmeric animate-stripes" : "bg-leaf/70")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-bold tracking-wide uppercase opacity-70">
        <span>Placed</span>
        <span className={cn(preparing && "opacity-100")}>Cooking</span>
        <span>Ready</span>
      </div>
    </section>
  );
}

/** A wobbling chef hat with rising steam when cooking, a timer otherwise. */
function Pot({ active }: { active: boolean }) {
  if (!active) {
    return (
      <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-background/70">
        <Timer className="size-7" />
      </span>
    );
  }
  return (
    <span className="relative grid size-16 shrink-0 place-items-end justify-center rounded-2xl bg-turmeric/25 pb-2" aria-hidden>
      <span className="absolute top-1 left-1/2 flex -translate-x-1/2 gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-4 w-1 animate-steam rounded-full bg-current opacity-0" style={{ animationDelay: `${i * 0.45}s` }} />
        ))}
      </span>
      <ChefHat className="size-8 animate-wobble" />
    </span>
  );
}
