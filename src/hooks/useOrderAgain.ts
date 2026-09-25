"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import type { MenuSnapshot } from "@/lib/menu/service";
import type { OrderDTO } from "@/lib/realtime/events";
import { MAX_QTY, useCart } from "@/stores/cart";
import { MENU_KEY } from "./useLiveMenu";

/** Puts a past order's dishes back in the cart (at today's prices), skipping anything sold out, then opens the cart. */
export function useOrderAgain() {
  const qc = useQueryClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function orderAgain(order: OrderDTO) {
    setBusy(true);
    try {
      const menu = await qc.fetchQuery({ queryKey: MENU_KEY, queryFn: () => api<MenuSnapshot>("/api/menu"), staleTime: 5_000 });
      const { add, setQty, lines } = useCart.getState();
      const skipped: string[] = [];
      let added = 0;
      for (const line of order.items) {
        const item = menu.items.find((i) => i.id === line.menuItemId);
        if (!item || !item.isAvailable || item.stock === 0) {
          skipped.push(line.name);
          continue;
        }
        const have = lines.find((l) => l.menuItemId === item.id)?.quantity ?? 0;
        const want = Math.min(MAX_QTY, have + line.quantity, item.stock ?? MAX_QTY);
        if (have === 0 && !add(item.id, item.pricePaise)) {
          skipped.push(line.name);
          continue;
        }
        setQty(item.id, want);
        added++;
      }
      if (added === 0) {
        toast.error("None of those dishes are available right now");
        return;
      }
      if (skipped.length) toast.warning(`Not available now: ${skipped.join(", ")}`);
      else toast.success("Added to your cart");
      router.push("/menu?cart=1");
    } catch {
      toast.error("Couldn't load the menu. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return { orderAgain, busy };
}
