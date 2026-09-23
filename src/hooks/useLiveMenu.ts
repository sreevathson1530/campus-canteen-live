"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client-api";
import type { MenuSnapshot } from "@/lib/menu/service";
import { useSocketEvent } from "./useSocketEvent";

export const MENU_KEY = ["menu"] as const;

/** Menu snapshot over REST, patched live by menu:item-updated, menu:changed and canteen:status. */
export function useLiveMenu() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: MENU_KEY, queryFn: () => api<MenuSnapshot>("/api/menu") });

  useSocketEvent("menu:item-updated", (item) => {
    qc.setQueryData<MenuSnapshot>(MENU_KEY, (m) => {
      if (!m) return m;
      const exists = m.items.some((i) => i.id === item.id);
      return { ...m, items: exists ? m.items.map((i) => (i.id === item.id ? item : i)) : [...m.items, item] };
    });
  });
  useSocketEvent("menu:changed", () => void qc.invalidateQueries({ queryKey: MENU_KEY }));
  useSocketEvent("canteen:status", (s) => {
    qc.setQueryData<MenuSnapshot>(MENU_KEY, (m) => (m ? { ...m, settings: { ...m.settings, ...s } } : m));
  });

  return query;
}
