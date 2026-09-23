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
        status === "live" && "bg-leaf-soft text-leaf",
        status === "reconnecting" && "bg-turmeric-soft text-[#7a5306] dark:text-turmeric",
        status === "offline" && "bg-chili-soft text-chili",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          status === "live" && "bg-[#2fa25a]",
          status === "reconnecting" && "animate-pulse bg-turmeric",
          status === "offline" && "bg-chili",
        )}
      />
      {LABEL[status]}
    </span>
  );
}
