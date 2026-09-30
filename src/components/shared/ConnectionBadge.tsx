"use client";

import { cn } from "@/lib/utils";
import { useConnectionStatus } from "@/hooks/useSocketEvent";

const LABEL = { live: "Live", reconnecting: "Reconnecting", offline: "Offline" } as const;

/** Header connection badge: Live (green), Reconnecting (amber), Offline (red), always with a text label. */
export function ConnectionBadge({ className }: { className?: string }) {
  const { status } = useConnectionStatus();
  return (
    <span
      role="status"
      aria-live="polite"
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        "bg-secondary text-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          status === "live" && "bg-[#4ade80]",
          status === "reconnecting" && "animate-pulse bg-turmeric",
          status === "offline" && "bg-white ring-2 ring-black/40",
        )}
      />
      {LABEL[status]}
    </span>
  );
}
