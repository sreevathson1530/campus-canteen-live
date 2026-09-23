"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Store } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ClientApiError } from "@/lib/client-api";
import { useLiveMenu, MENU_KEY } from "@/hooks/useLiveMenu";
import type { MenuSnapshot } from "@/lib/menu/service";
import type { MenuItemDTO } from "@/lib/realtime/events";
import { formatRupees } from "@/lib/money";
import { cn } from "@/lib/utils";
import { DishImage } from "@/components/menu/DishImage";

type SaveState = "idle" | "saving" | "saved";

/** Debounced autosave (500 ms) with a tiny status indicator. */
function useAutosave<T>(save: (v: T) => Promise<void>) {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => () => clearTimeout(timer.current), []);
  function schedule(v: T) {
    clearTimeout(timer.current);
    setState("saving");
    timer.current = setTimeout(async () => {
      try {
        await saveRef.current(v);
        setState("saved");
      } catch (e) {
        setState("idle");
        toast.error(e instanceof ClientApiError ? e.message : "Couldn't save");
      }
    }, 500);
  }
  return { state, schedule };
}

function SaveDot({ state }: { state: SaveState }) {
  if (state === "saving") return <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Saving" />;
  if (state === "saved") return <Check className="size-4 text-leaf" aria-label="Saved" />;
  return <span className="size-4" />;
}

function StockRow({ item }: { item: MenuItemDTO }) {
  const qc = useQueryClient();
  const [stockText, setStockText] = useState(item.stock === null ? "" : String(item.stock));
  const [focused, setFocused] = useState(false);
  // Follow live changes from other screens (orders decrement stock) unless the user is typing.
  const shown = focused ? stockText : item.stock === null ? "" : String(item.stock);

  const { state, schedule } = useAutosave<{ isAvailable?: boolean; stock?: number | null }>(async (body) => {
    const { item: saved } = await api<{ item: MenuItemDTO }>(`/api/menu/items/${item.id}/stock`, { method: "PATCH", body });
    qc.setQueryData<MenuSnapshot>(MENU_KEY, (m) => (m ? { ...m, items: m.items.map((i) => (i.id === saved.id ? saved : i)) } : m));
  });

  const low = item.stock !== null && item.stock <= 5;
  return (
    <li className={cn("flex items-center gap-3 rounded-2xl border bg-card p-3", low && "border-turmeric bg-turmeric-soft/40", !item.isAvailable && "opacity-70")}>
      <DishImage name={item.name} src={item.imageUrl} className="size-12 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatRupees(item.pricePaise)}
          {low && <span className="ml-2 font-bold text-[#7a5306] dark:text-turmeric">Low stock</span>}
          {!item.isAvailable && <span className="ml-2 font-bold text-chili">Switched off</span>}
        </p>
      </div>
      <SaveDot state={state} />
      <label className="grid gap-0.5 text-center">
        <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">Stock</span>
        <Input
          value={shown}
          inputMode="numeric"
          placeholder="∞"
          aria-label={`Stock for ${item.name}, blank for unlimited`}
          onFocus={() => {
            setStockText(item.stock === null ? "" : String(item.stock));
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
            setStockText(v);
            schedule({ stock: v === "" ? null : Number(v) });
          }}
          className="h-10 w-16 rounded-xl text-center font-bold tabular"
        />
      </label>
      <label className="grid justify-items-center gap-1">
        <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">On</span>
        <Switch
          checked={item.isAvailable}
          onCheckedChange={(v) => {
            qc.setQueryData<MenuSnapshot>(MENU_KEY, (m) => (m ? { ...m, items: m.items.map((i) => (i.id === item.id ? { ...i, isAvailable: v } : i)) } : m));
            schedule({ isAvailable: v });
          }}
          aria-label={`${item.name} available`}
        />
      </label>
    </li>
  );
}

function CanteenStatusCard({ isOpen, closedMessage }: { isOpen: boolean; closedMessage: string | null }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState(closedMessage ?? "");
  const { state, schedule } = useAutosave<{ isOpen?: boolean; closedMessage?: string | null }>(async (body) => {
    await api("/api/settings", { method: "PATCH", body });
  });
  function setOpen(v: boolean) {
    qc.setQueryData<MenuSnapshot>(MENU_KEY, (m) => (m ? { ...m, settings: { ...m.settings, isOpen: v } } : m));
    schedule({ isOpen: v, closedMessage: msg || null });
  }
  return (
    <section className={cn("rounded-3xl border p-4", isOpen ? "bg-leaf-soft" : "bg-chili-soft")}>
      <div className="flex items-center gap-3">
        <Store className={cn("size-6", isOpen ? "text-leaf" : "text-chili")} />
        <div className="flex-1">
          <p className="font-display text-xl font-extrabold">{isOpen ? "Canteen is open" : "Canteen is closed"}</p>
          <p className="text-sm text-muted-foreground">{isOpen ? "Students can order." : "Ordering is paused; orders in progress continue."}</p>
        </div>
        <SaveDot state={state} />
        <Switch checked={isOpen} onCheckedChange={setOpen} aria-label="Canteen open" className="scale-125" />
      </div>
      <Input
        value={msg}
        onChange={(e) => {
          setMsg(e.target.value.slice(0, 140));
          if (!isOpen) schedule({ closedMessage: e.target.value.slice(0, 140) || null });
        }}
        placeholder="Closed message, e.g. Back at 2 PM"
        className="mt-3 h-11 rounded-xl bg-background"
        aria-label="Closed message"
      />
    </section>
  );
}

export function StockManager() {
  const { data, isLoading } = useLiveMenu();
  if (isLoading || !data) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-32 rounded-3xl" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-5 pb-6">
      <h1 className="font-display text-3xl font-extrabold">Stock & status</h1>
      <CanteenStatusCard isOpen={data.settings.isOpen} closedMessage={data.settings.closedMessage} />
      {data.categories.map((c) => {
        const items = data.items.filter((i) => i.categoryId === c.id);
        if (!items.length) return null;
        return (
          <section key={c.id} className="grid gap-2">
            <h2 className="font-display text-lg font-extrabold">{c.name}</h2>
            <ul className="grid gap-2">
              {items.map((i) => (
                <StockRow key={i.id} item={i} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
