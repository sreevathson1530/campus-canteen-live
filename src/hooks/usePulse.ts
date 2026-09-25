"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client-api";
import type { Pulse } from "@/lib/pulse";

/** Queue length, wait estimate and best sellers, refreshed every 20 s while the page is visible. */
export function usePulse(initial?: Pulse) {
  return useQuery({
    queryKey: ["pulse"],
    queryFn: () => api<Pulse>("/api/pulse"),
    initialData: initial,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });
}
