"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MAX_QTY = 10;
export const MAX_LINES = 10;

export interface CartLine {
  menuItemId: string;
  quantity: number;
  /** Price the student saw when adding; used to flag "Price updated". */
  seenPricePaise: number;
}

interface CartState {
  lines: CartLine[];
  note: string;
  add: (menuItemId: string, pricePaise: number) => boolean;
  setQty: (menuItemId: string, quantity: number) => void;
  remove: (menuItemId: string) => void;
  acknowledgePrice: (menuItemId: string, pricePaise: number) => void;
  setNote: (note: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      note: "",
      add: (menuItemId, pricePaise) => {
        const { lines } = get();
        const existing = lines.find((l) => l.menuItemId === menuItemId);
        if (existing) {
          if (existing.quantity >= MAX_QTY) return false;
          set({ lines: lines.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: l.quantity + 1 } : l)) });
          return true;
        }
        if (lines.length >= MAX_LINES) return false;
        set({ lines: [...lines, { menuItemId, quantity: 1, seenPricePaise: pricePaise }] });
        return true;
      },
      setQty: (menuItemId, quantity) => {
        if (quantity <= 0) return get().remove(menuItemId);
        set({
          lines: get().lines.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l)),
        });
      },
      remove: (menuItemId) => set({ lines: get().lines.filter((l) => l.menuItemId !== menuItemId) }),
      acknowledgePrice: (menuItemId, pricePaise) =>
        set({ lines: get().lines.map((l) => (l.menuItemId === menuItemId ? { ...l, seenPricePaise: pricePaise } : l)) }),
      setNote: (note) => set({ note: note.slice(0, 140) }),
      clear: () => set({ lines: [], note: "" }),
    }),
    { name: "ccl-cart", version: 1 },
  ),
);
