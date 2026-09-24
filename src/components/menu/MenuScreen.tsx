"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, Store } from "lucide-react";
import { useLiveMenu } from "@/hooks/useLiveMenu";
import { useCart } from "@/stores/cart";
import { formatRupees } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CartSheet, useCartRows } from "./CartSheet";
import { DishCard } from "./DishCard";
import { DishSheet } from "./DishSheet";

export function MenuScreen({ firstName }: { firstName: string }) {
  const { data, isLoading, isError, refetch } = useLiveMenu();
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const [cartOpen, setCartOpen] = useState(false);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const { count, totalPaise, blocked } = useCartRows(data?.items);

  const settings = data?.settings;
  const isOpen = settings?.isOpen ?? true;
  const qtyOf = (id: string) => lines.find((l) => l.menuItemId === id)?.quantity ?? 0;
  const openItem = data?.items.find((i) => i.id === openItemId) ?? null;

  const sections = useMemo(
    () =>
      (data?.categories ?? [])
        .map((c) => ({ ...c, items: (data?.items ?? []).filter((i) => i.categoryId === c.id).sort((a, b) => a.sortOrder - b.sortOrder) }))
        .filter((c) => c.items.length > 0),
    [data],
  );

  // Highlight the tab of the section in view.
  useEffect(() => {
    const els = [...sectionRefs.current.values()];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveCat(top.target.id.replace("cat-", ""));
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections.length]);

  function addItem(id: string, pricePaise: number, name: string) {
    if (!add(id, pricePaise)) toast.error(`Up to 10 of ${name}, and 10 different items per order`);
  }

  const shownCat = activeCat ?? sections[0]?.id ?? null;

  return (
    <div className="pb-24">
      <section className="pt-2 pb-4">
        <p className="text-sm font-semibold text-muted-foreground">Hi {firstName} 👋</p>
        <h1 className="font-display text-[2rem] leading-[1.05] font-extrabold">What are you craving?</h1>
      </section>

      {!isOpen && (
        <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl bg-chili-soft p-4 text-chili">
          <Store className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">{settings?.canteenName ?? "The canteen"} is closed</p>
            <p className="text-sm">{settings?.closedMessage || "Ordering is paused for now."}</p>
          </div>
        </div>
      )}

      {/* Sticky category tabs */}
      <nav
        aria-label="Categories"
        className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 -mx-4 mb-3 border-b bg-background/90 px-4 py-2.5 backdrop-blur-md"
      >
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {isLoading
            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />)
            : sections.map((c) => (
                <li key={c.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => sectionRefs.current.get(c.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    aria-current={shownCat === c.id ? "true" : undefined}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                      shownCat === c.id ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground hover:bg-muted",
                    )}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
        </ul>
      </nav>

      {isError && (
        <div className="rounded-2xl border p-6 text-center">
          <p className="font-semibold">Couldn&apos;t load the menu.</p>
          <button className="mt-2 font-semibold text-leaf" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-3xl" />
          ))}
        </div>
      )}

      <div className="grid gap-8">
        {sections.map((c, ci) => (
          <section
            key={c.id}
            id={`cat-${c.id}`}
            ref={(el) => {
              if (el) sectionRefs.current.set(c.id, el);
              else sectionRefs.current.delete(c.id);
            }}
            className="scroll-mt-32"
            aria-labelledby={`h-${c.id}`}
          >
            <h2 id={`h-${c.id}`} className="mb-3 font-display text-xl font-extrabold">
              {c.name}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {c.items.map((item, ii) => (
                <DishCard
                  key={item.id}
                  item={item}
                  qty={qtyOf(item.id)}
                  canOrder={isOpen}
                  priority={ci === 0 && ii < 4}
                  onAdd={() => addItem(item.id, item.pricePaise, item.name)}
                  onQty={(q) => setQty(item.id, q)}
                  onOpen={() => setOpenItemId(item.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Food photos from Wikimedia Commons ·{" "}
        <Link href="/credits" className="font-semibold underline-offset-4 hover:underline">
          Credits
        </Link>
      </p>

      {/* Sticky cart bar, above the bottom tab bar */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-30 px-3 md:bottom-4">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className={cn(
              "mx-auto flex w-full max-w-lg animate-rise items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-paper shadow-xl shadow-leaf/30",
              blocked || !isOpen ? "bg-foreground" : "bg-leaf",
            )}
          >
            <span className="relative grid size-9 place-items-center rounded-xl bg-white/15">
              <ShoppingBag className="size-5" />
              <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-turmeric text-[11px] font-extrabold text-[#3a2a05]">
                {count}
              </span>
            </span>
            <span className="flex-1">
              <span className="block text-xs font-semibold opacity-80">
                {count} {count === 1 ? "item" : "items"}
                {blocked ? " · check cart" : ""}
              </span>
              <span className="font-display text-lg font-extrabold tabular">{formatRupees(totalPaise)}</span>
            </span>
            <span className="font-bold">View cart →</span>
          </button>
        </div>
      )}

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={data?.items}
        isOpen={isOpen}
        closedMessage={settings?.closedMessage ?? null}
      />
      <DishSheet
        item={openItem}
        qty={openItem ? qtyOf(openItem.id) : 0}
        canOrder={isOpen}
        onClose={() => setOpenItemId(null)}
        onAdd={() => openItem && addItem(openItem.id, openItem.pricePaise, openItem.name)}
        onQty={(q) => openItem && setQty(openItem.id, q)}
      />
    </div>
  );
}
