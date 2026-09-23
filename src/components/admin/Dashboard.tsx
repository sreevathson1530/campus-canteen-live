"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChefHat, Clock3, IndianRupee, ListOrdered, Smartphone, XCircle, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/client-api";
import { formatRupees } from "@/lib/money";
import type { StatsDTO } from "@/lib/realtime/events";
import { canteenHour } from "@/lib/time";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { cn } from "@/lib/utils";

const STATS_KEY = ["admin-stats"] as const;

function hourLabel(h: number): string {
  const suffix = h < 12 ? "a" : "p";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}${suffix}`;
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "leaf" | "turmeric" | "chili";
}) {
  return (
    <div className="rounded-3xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <span
          className={cn(
            "grid size-8 place-items-center rounded-xl bg-secondary",
            tone === "leaf" && "bg-leaf-soft text-leaf",
            tone === "turmeric" && "bg-turmeric-soft text-[#7a5306] dark:text-turmeric",
            tone === "chili" && "bg-chili-soft text-chili",
          )}
        >
          <Icon className="size-4" />
        </span>
        {label}
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold tabular">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function HourTooltip({ active, payload }: { active?: boolean; payload?: { payload: { hour: number; count: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { hour, count } = payload[0].payload;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold">
        {hourLabel(hour)}–{hourLabel((hour + 1) % 24)}
      </p>
      <p className="text-muted-foreground tabular">
        {count} {count === 1 ? "order" : "orders"}
      </p>
    </div>
  );
}

export function Dashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: STATS_KEY, queryFn: () => api<{ stats: StatsDTO }>("/api/admin/stats").then((r) => r.stats) });
  const [showTable, setShowTable] = useState(false);

  useSocketEvent("stats:update", (s) => qc.setQueryData(STATS_KEY, s));
  useSocketEvent("presence:update", (p) => qc.setQueryData<StatsDTO>(STATS_KEY, (s) => (s ? { ...s, presence: p } : s)));

  if (isLoading || !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-3xl" />
        ))}
      </div>
    );
  }

  // Show a readable window: from the first busy hour (or 7 AM) to the last (or now).
  const nowHour = canteenHour(new Date());
  const busy = data.ordersPerHour.filter((h) => h.count > 0).map((h) => h.hour);
  const from = Math.min(7, ...busy);
  const to = Math.max(nowHour, 20, ...busy);
  const hours = data.ordersPerHour.filter((h) => h.hour >= from && h.hour <= to);
  const maxTop = Math.max(1, ...data.topItems.map((t) => t.quantity));

  return (
    <div className="grid gap-5 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Today, live</p>
          <h1 className="font-display text-3xl font-extrabold">Dashboard</h1>
        </div>
        <div className="flex gap-2 text-sm font-semibold" aria-label="Who's online">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
            <ChefHat className="size-4" /> {data.presence.kitchen} kitchen {data.presence.kitchen === 1 ? "screen" : "screens"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
            <Smartphone className="size-4" /> {data.presence.students} {data.presence.students === 1 ? "student" : "students"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile icon={ListOrdered} label="Orders" value={String(data.ordersToday)} tone="leaf" />
        <Tile icon={IndianRupee} label="Revenue" value={formatRupees(data.revenueTodayPaise)} hint="Collected orders" tone="leaf" />
        <Tile icon={Activity} label="Active now" value={String(data.activeOrders)} tone="turmeric" />
        <Tile
          icon={Clock3}
          label="Avg prep"
          value={data.avgPrepSecondsToday === null ? "—" : `${Math.round(data.avgPrepSecondsToday / 60)} min`}
          hint="Placed → ready"
        />
        <Tile icon={XCircle} label="Cancelled / rejected" value={String(data.cancelledOrRejectedToday)} tone="chili" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-3xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">Orders per hour</h2>
            <button type="button" className="text-sm font-semibold text-leaf" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
              {showTable ? "Show chart" : "Show table"}
            </button>
          </div>
          {showTable ? (
            <table className="w-full text-sm tabular">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 font-semibold">Hour</th>
                  <th className="py-1 text-right font-semibold">Orders</th>
                </tr>
              </thead>
              <tbody>
                {hours.map((h) => (
                  <tr key={h.hour} className="border-t">
                    <td className="py-1">
                      {hourLabel(h.hour)}–{hourLabel((h.hour + 1) % 24)}
                    </td>
                    <td className="py-1 text-right font-semibold">{h.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-56 w-full" role="img" aria-label={`Orders per hour today. Peak ${Math.max(0, ...hours.map((h) => h.count))} orders.`}>
              <ResponsiveContainer>
                <BarChart data={hours} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap={3}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
                  <XAxis dataKey="hour" tickFormatter={hourLabel} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={40} />
                  <Tooltip content={<HourTooltip />} cursor={{ fill: "var(--muted)", radius: 6 }} />
                  <Bar
                    dataKey="count"
                    fill="var(--chart-bar)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                    shape={(props: React.ComponentProps<typeof Rectangle> & { payload?: { hour: number } }) => (
                      <Rectangle {...props} fillOpacity={(props.payload?.hour ?? 0) > nowHour ? 0.25 : 1} />
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Now: {hourLabel(nowHour)}. Later hours are faded.</p>
        </section>

        <section className="rounded-3xl border bg-card p-4">
          <h2 className="mb-3 font-display text-lg font-extrabold">Top items today</h2>
          {data.topItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders yet today.</p>
          ) : (
            <ol className="grid gap-3">
              {data.topItems.map((t, i) => (
                <li key={t.name} className="grid gap-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">
                      <span className="mr-2 text-muted-foreground tabular">{i + 1}</span>
                      {t.name}
                    </span>
                    <span className="font-bold tabular">{t.quantity}</span>
                  </div>
                  <div className="h-2 rounded-full bg-chart-bar-muted" aria-hidden>
                    <div className="h-2 rounded-full bg-chart-bar" style={{ width: `${(t.quantity / maxTop) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
