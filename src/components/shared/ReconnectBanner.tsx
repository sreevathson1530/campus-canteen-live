"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useConnectionStatus } from "@/hooks/useSocketEvent";

const DELAY_MS = 3000;

/** Shown once the socket has been down for more than 3 seconds. */
export function ReconnectBanner({ message = "Reconnecting… this screen may be out of date" }: { message?: string }) {
  const { status, disconnectedSince } = useConnectionStatus();
  const [shownFor, setShownFor] = useState<number | null>(null);

  useEffect(() => {
    if (status === "live" || disconnectedSince === null) return;
    const wait = Math.max(0, DELAY_MS - (Date.now() - disconnectedSince));
    const t = setTimeout(() => setShownFor(disconnectedSince), wait);
    return () => clearTimeout(t);
  }, [status, disconnectedSince]);

  const show = status !== "live" && disconnectedSince !== null && shownFor === disconnectedSince;
  if (!show) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 bg-turmeric-soft px-4 py-2 text-sm font-semibold text-[#7a5306] dark:text-turmeric"
    >
      <WifiOff className="size-4" aria-hidden />
      {status === "offline" ? "Offline. We'll resync as soon as you're back." : message}
    </div>
  );
}
