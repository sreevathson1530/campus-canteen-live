"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Flame, Search, ShoppingBag, Store, Timer, X } from "lucide-react";
import { useLiveMenu } from "@/hooks/useLiveMenu";
import { usePulse } from "@/hooks/usePulse";
import type { MenuItemDTO } from "@/lib/realtime/events";
import { stillFor } from "@/lib/dish-keys";
import { useCart } from "@/stores/cart";
import { formatRupees } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CartSheet, useCartRows } from "./CartSheet";
import { DishCard, isSoldOut } from "./DishCard";
import { DishImage } from "./DishImage";
import { DishSheet } from "./DishSheet";
import { VegMark } from "./VegMark";

type FilterKey = "veg" | "under50" | "quick" | "mild";
const FILTERS: { key: FilterKey; label: string; test: (i: MenuItemDTO) => boolean }[] = [
  { key: "veg", label: "Veg only", test: (i) => i.isVeg },
  { key: "under50", label: "Under ₹50", test: (i) => i.pricePaise < 5000 },
  { key: "quick", label: "Ready in 5 min", test: (i) => i.prepMinutes <= 5 },
  { key: "mild", label: "Not spicy", test: (i) => i.spiceLevel <= 1 },
];

/** Every word of the query must appear in the name, description or ingredients. */
function matches(i: MenuItemDTO, q: string): boolean {
  if (!q) return true;
  const hay = [i.name, i.description ?? "", ...i.ingredients].join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export function MenuScreen({ firstName }: { firstName: string }) {
  const { data, isLoading, isError, refetch } = useLiveMenu();
  const { data: pulse } = usePulse();
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const openCartOnLoad = useSearchParams().get("cart") === "1";
  const [cartOpen, setCartOpen] = useState(openCartOnLoad);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Set<FilterKey>>(() => new Set());
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const { count, totalPaise, blocked } = useCartRows(data?.items);

  const settings = data?.settings;
  const isOpen = settings?.isOpen ?? true;
  const qtyOf = (id: string) => lines.find((l) => l.menuItemId === id)?.quantity ?? 0;
  const openItem = data?.items.find((i) => i.id === openItemId) ?? null;

  const narrowing = query.trim() !== "" || filters.size > 0;
  const sections = useMemo(() => {
    const active = FILTERS.filter((f) => filters.has(f.key));
    const keep = (i: MenuItemDTO) => matches(i, query.trim()) && active.every((f) => f.test(i));
    return (data?.categories ?? [])
      .map((c) => ({
        ...c,
        items: (data?.items ?? []).filter((i) => i.categoryId === c.id && keep(i)).sort((a, b) => a.sortOrder - b.sortOrder),
      }))
      .filter((c) => c.items.length > 0);
  }, [data, query, filters]);
  const resultCount = sections.reduce((n, c) => n + c.items.length, 0);

  // Best sellers from real sales (last 7 days), topped up with items tagged "bestseller".
  const popular = useMemo(() => {
    const items = data?.items ?? [];
    const byId = new Map(items.map((i) => [i.id, i]));
    const sold = (pulse?.popular ?? []).map((p) => byId.get(p.id)).filter((i): i is MenuItemDTO => !!i && !isSoldOut(i));
    const tagged = items.filter((i) => i.tags.includes("bestseller") && !isSoldOut(i) && !sold.includes(i));
    return [...sold, ...tagged].slice(0, 6);
  }, [data, pulse]);

  const pairings = useMemo(() => {
    if (!openItem || !data) return [];
    return openItem.pairsWith
      .map((n) => data.items.find((i) => i.name.toLowerCase() === n.toLowerCase()))
      .filter((i): i is MenuItemDTO => !!i && i.id !== openItem.id);
  }, [openItem, data]);

  // "Order again" lands here with ?cart=1: the cart starts open; tidy the URL afterwards.
  useEffect(() => {
    if (!openCartOnLoad) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("cart");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [openCartOnLoad]);

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

  function addItem(id: string, pricePaise: number, name: string): boolean {
    const ok = add(id, pricePaise);
    if (!ok) toast.error(`Up to 10 of ${name}, and 10 different items per order`);
    return ok;
  }

  function toggleFilter(k: FilterKey) {
    setFilters((f) => {
      const n = new Set(f);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }

  const shownCat = activeCat ?? sections[0]?.id ?? null;

  return (
    <div className="pb-24">
      <section className="pt-2 pb-3">
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

      {isOpen && pulse && (
        <div
          role="status"
          className={cn("mb-3 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm", pulse.busy ? "bg-turmeric-soft" : "bg-leaf-soft")}
        >
          <span
            className={cn("grid size-9 shrink-0 place-items-center rounded-xl", pulse.busy ? "bg-turmeric text-[#3a2a05]" : "bg-leaf text-paper")}
          >
            {pulse.busy ? <Flame className="size-5" /> : <Timer className="size-5" />}
          </span>
          <p className="flex-1 leading-snug">
            <span className="font-bold">{pulse.busy ? "Kitchen is busy" : "Kitchen is free"}</span>
            <span className="text-muted-foreground">
              {" · "}
              {pulse.queueLength === 0
                ? "no orders ahead of you"
                : `${pulse.queueLength} ${pulse.queueLength === 1 ? "order" : "orders"} ahead`}
            </span>
          </p>
          <span className="font-display text-lg font-extrabold whitespace-nowrap tabular">~{pulse.waitMinutes} min</span>
        </div>
      )}

      {/* Search and filters */}
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search dosa, biryani, coffee…"
          aria-label="Search the menu"
          className="h-12 w-full rounded-2xl border bg-card pr-10 pl-10 text-[15px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <div role="group" aria-label="Filters" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {FILTERS.map((f) => {
          const on = filters.has(f.key);
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggleFilter(f.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                on ? "border-leaf bg-leaf text-paper" : "bg-card hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Popular right now */}
      {!narrowing && popular.length > 0 && (
        <section aria-labelledby="pop-h" className="mb-5">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 id="pop-h" className="font-display text-xl font-extrabold">
              Popular right now
            </h2>
            <span className="text-xs font-semibold text-muted-foreground">Top picks this week</span>
          </div>
          <ul className="relative -mx-4 flex scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {popular.map((item, i) => (
              <li key={item.id} className="w-36 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenItemId(item.id)}
                  className="group w-full text-left"
                  aria-label={`${item.name}, number ${i + 1} this week`}
                >
                  <div className="relative">
                    <DishImage
                      name={item.name}
                      src={item.imageUrl}
                      still={stillFor(item.modelKey)}
                      priority={i < 3}
                      className="aspect-square rounded-2xl transition-transform group-active:scale-95"
                    />
                    <span className="absolute bottom-1.5 left-1.5 grid size-7 place-items-center rounded-full bg-turmeric font-display text-sm font-extrabold text-[#3a2a05] shadow">
                      {i + 1}
                    </span>
                    {qtyOf(item.id) > 0 && (
                      <span className="absolute top-1.5 right-1.5 rounded-full bg-leaf px-2 py-0.5 text-[11px] font-bold text-paper">
                        ×{qtyOf(item.id)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold">
                    <VegMark isVeg={item.isVeg} />
                    <span className="truncate">{item.name}</span>
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground tabular">{formatRupees(item.pricePaise)}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
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
                    {narrowing && <span className="ml-1.5 opacity-60 tabular">{c.items.length}</span>}
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

      {narrowing && !isLoading && (
        <div className="mb-3 flex items-center justify-between text-sm">
          <p className="font-semibold" aria-live="polite">
            {resultCount} {resultCount === 1 ? "dish" : "dishes"} found
          </p>
          <button
            type="button"
            className="font-semibold text-leaf"
            onClick={() => {
              setQuery("");
              setFilters(new Set());
            }}
          >
            Clear all
          </button>
        </div>
      )}
      {narrowing && !isLoading && resultCount === 0 && (
        <div className="rounded-3xl border border-dashed p-8 text-center">
          <p className="font-bold">Nothing matches that</p>
          <p className="text-sm text-muted-foreground">Try another word or remove a filter.</p>
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
        pairings={pairings}
        qtyOf={qtyOf}
        onAddPairing={(p) => {
          if (addItem(p.id, p.pricePaise, p.name)) toast.success(`${p.name} added`);
        }}
      />
    </div>
  );
}
