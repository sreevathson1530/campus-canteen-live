"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Clock3, Flame, Search, ShieldCheck, ShoppingBag, Store, Wallet, X } from "lucide-react";
import { useLiveMenu } from "@/hooks/useLiveMenu";
import { usePulse } from "@/hooks/usePulse";
import type { MenuItemDTO } from "@/lib/realtime/events";
import { useCart } from "@/stores/cart";
import { formatRupees } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { CartSheet, useCartRows } from "./CartSheet";
import { AddControl, DishCard, isSoldOut } from "./DishCard";
import { DishImage } from "./DishImage";
import { DishSheet } from "./DishSheet";
import { VegMark } from "./VegMark";

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
  const [vegOnly, setVegOnly] = useState(false);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const tabRefs = useRef(new Map<string, HTMLElement>());
  const { count, totalPaise, blocked } = useCartRows(data?.items);

  const settings = data?.settings;
  const isOpen = settings?.isOpen ?? true;
  const qtyOf = (id: string) => lines.find((l) => l.menuItemId === id)?.quantity ?? 0;
  const openItem = data?.items.find((i) => i.id === openItemId) ?? null;

  const q = query.trim();
  const narrowing = q !== "" || vegOnly;
  const sections = useMemo(() => {
    const keep = (i: MenuItemDTO) => matches(i, q) && (!vegOnly || i.isVeg);
    return (data?.categories ?? [])
      .map((c) => ({
        ...c,
        items: (data?.items ?? []).filter((i) => i.categoryId === c.id && keep(i)).sort((a, b) => a.sortOrder - b.sortOrder),
      }))
      .filter((c) => c.items.length > 0);
  }, [data, q, vegOnly]);
  const resultCount = sections.reduce((n, c) => n + c.items.length, 0);

  // Best sellers from real sales (last 7 days), topped up with items tagged "bestseller".
  const popular = useMemo(() => {
    const items = data?.items ?? [];
    const byId = new Map(items.map((i) => [i.id, i]));
    const sold = (pulse?.popular ?? []).map((p) => byId.get(p.id)).filter((i): i is MenuItemDTO => !!i && !isSoldOut(i));
    const tagged = items.filter((i) => i.tags.includes("bestseller") && !isSoldOut(i) && !sold.includes(i));
    return [...sold, ...tagged].slice(0, 8);
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

  // Highlight the tab of the section in view, and keep that tab visible in the strip.
  useEffect(() => {
    const els = [...sectionRefs.current.values()];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!top) return;
        const id = top.target.id.replace("cat-", "");
        setActiveCat(id);
        tabRefs.current.get(id)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      },
      { rootMargin: "-170px 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections.length]);

  function addItem(item: MenuItemDTO): boolean {
    const ok = add(item.id, item.pricePaise);
    if (!ok) toast.error(`Up to 10 of ${item.name}, and 10 different items per order`);
    return ok;
  }

  const shownCat = activeCat ?? sections[0]?.id ?? null;
  const bannerItem = data?.items.find((i) => i.imageUrl?.includes("margherita")) ?? data?.items.find((i) => i.imageUrl);

  return (
    <div className="pb-24">
      {/* Banner */}
      <section className="relative -mx-4 -mt-4 overflow-hidden bg-gradient-to-br from-brand to-brand-dark px-4 pt-5 pb-6 text-white sm:mx-0 sm:mt-0 sm:rounded-2xl sm:px-8 sm:py-9">
        {bannerItem && (
          <DishImage
            name=""
            src={bannerItem.imageUrl}
            priority
            className="absolute -right-10 -bottom-10 size-40 rounded-full border-4 border-white/25 shadow-2xl sm:top-1/2 sm:right-8 sm:bottom-auto sm:size-56 sm:-translate-y-1/2"
          />
        )}
        <div className="relative max-w-[70%] sm:max-w-md">
          <p className="text-sm text-white/85">Hi {firstName}</p>
          <h1 className="mt-0.5 text-2xl leading-tight font-bold sm:text-4xl">What would you like today?</h1>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
            {isOpen ? (
              <>
                <Clock3 className="size-4" /> Ready in about {pulse?.waitMinutes ?? settings?.minutesPerOrder ?? 5} min
              </>
            ) : (
              <>
                <Store className="size-4" /> Closed right now
              </>
            )}
          </p>
        </div>
      </section>

      {/* Highlights */}
      <ul className="-mx-4 flex gap-2 overflow-x-auto bg-card px-4 py-3 text-xs font-semibold text-muted-foreground [scrollbar-width:none] sm:mx-0 sm:mt-3 sm:justify-center sm:gap-8 sm:rounded-xl sm:border sm:text-sm">
        {[
          [Flame, "Freshly made to order"],
          [ShieldCheck, "Order confirmed by code"],
          [Wallet, "Pay at the counter"],
        ].map(([Icon, text]) => {
          const I = Icon as typeof Flame;
          return (
            <li key={text as string} className="flex shrink-0 items-center gap-1.5">
              <I className="size-4 text-brand" /> {text as string}
            </li>
          );
        })}
      </ul>

      {!isOpen && (
        <div role="status" className="mt-3 rounded-xl border border-chili/30 bg-chili-soft p-3 text-sm text-chili">
          <b>{settings?.canteenName ?? "We"} is closed.</b> {settings?.closedMessage || "Ordering is paused for now."}
        </div>
      )}

      {/* Search + veg filter */}
      <div className="mt-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the menu"
            aria-label="Search the menu"
            className="h-11 w-full rounded-lg border bg-card pr-10 pl-10 text-[15px] outline-none placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <label className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-sm font-semibold">
          <VegMark isVeg />
          Veg
          <Switch checked={vegOnly} onCheckedChange={setVegOnly} aria-label="Show vegetarian dishes only" />
        </label>
      </div>

      {/* Category strip */}
      <nav
        aria-label="Categories"
        className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 -mx-4 mt-3 border-b bg-card/95 px-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-3"
      >
        <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] sm:justify-center sm:gap-3">
          {isLoading
            ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="m-2 size-14 shrink-0 rounded-full" />)
            : sections.map((c) => {
                const on = shownCat === c.id;
                return (
                  <li
                    key={c.id}
                    className="shrink-0"
                    ref={(el) => {
                      if (el) tabRefs.current.set(c.id, el);
                      else tabRefs.current.delete(c.id);
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => sectionRefs.current.get(c.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      aria-current={on ? "true" : undefined}
                      className="group flex w-[4.75rem] flex-col items-center gap-1 px-1 pt-2.5 pb-2"
                    >
                      <DishImage
                        name={c.name}
                        src={c.items[0]?.imageUrl ?? null}
                        className={cn(
                          "size-12 rounded-full ring-2 ring-offset-2 ring-offset-card transition",
                          on ? "ring-brand" : "ring-transparent group-hover:ring-border",
                        )}
                      />
                      <span className={cn("line-clamp-1 text-[11px] leading-tight font-semibold", on ? "text-brand" : "text-muted-foreground")}>
                        {c.name.replace(" & ", " · ").split(" · ")[0]}
                      </span>
                    </button>
                  </li>
                );
              })}
        </ul>
      </nav>

      {isError && (
        <div className="mt-4 rounded-xl border bg-card p-6 text-center">
          <p className="font-semibold">Couldn&apos;t load the menu.</p>
          <button className="mt-2 font-semibold text-brand" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      )}

      {isLoading && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl sm:h-72" />
          ))}
        </div>
      )}

      {/* Bestsellers */}
      {!narrowing && popular.length > 0 && (
        <section aria-labelledby="pop-h" className="mt-6">
          <h2 id="pop-h" className="flex items-center gap-2 text-lg font-bold">
            <span aria-hidden className="h-5 w-1 rounded-full bg-brand" />
            Bestsellers
          </h2>
          <ul className="relative -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {popular.map((item, i) => (
              <li key={item.id} className="w-40 shrink-0 overflow-hidden rounded-xl border bg-card shadow-sm">
                <button type="button" onClick={() => setOpenItemId(item.id)} className="block w-full text-left" aria-label={`${item.name}, view details`}>
                  <DishImage name={item.name} src={item.imageUrl} priority={i < 3} className="aspect-[4/3] w-full" />
                </button>
                <div className="p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <VegMark isVeg={item.isVeg} />
                    <span className="truncate">{item.name}</span>
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold tabular">{formatRupees(item.pricePaise)}</span>
                    <AddControl
                      item={item}
                      qty={qtyOf(item.id)}
                      canOrder={isOpen}
                      onAdd={() => addItem(item)}
                      onQty={(n) => setQty(item.id, n)}
                      className="[&:is(button)]:h-8 [&:is(button)]:px-3"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {narrowing && !isLoading && (
        <div className="mt-5 flex items-center justify-between text-sm">
          <p className="font-semibold" aria-live="polite">
            {resultCount} {resultCount === 1 ? "dish" : "dishes"} found
          </p>
          <button
            type="button"
            className="font-semibold text-brand"
            onClick={() => {
              setQuery("");
              setVegOnly(false);
            }}
          >
            Clear
          </button>
        </div>
      )}
      {narrowing && !isLoading && resultCount === 0 && (
        <div className="mt-3 rounded-xl border border-dashed bg-card p-8 text-center">
          <p className="font-semibold">Nothing matches that</p>
          <p className="text-sm text-muted-foreground">Try another word or turn off the Veg filter.</p>
        </div>
      )}

      {/* Sections */}
      {sections.map((c, ci) => (
        <section
          key={c.id}
          id={`cat-${c.id}`}
          ref={(el) => {
            if (el) sectionRefs.current.set(c.id, el);
            else sectionRefs.current.delete(c.id);
          }}
          className="scroll-mt-40 pt-7"
          aria-labelledby={`h-${c.id}`}
        >
          <h2 id={`h-${c.id}`} className="flex items-center gap-2 text-lg font-bold">
            <span aria-hidden className="h-5 w-1 rounded-full bg-brand" />
            {c.name}
            <span className="text-sm font-medium text-muted-foreground">{c.items.length} items</span>
          </h2>
          <div className="-mx-4 mt-3 divide-y border-y bg-card sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:divide-y-0 sm:border-0 sm:bg-transparent lg:grid-cols-4 [&>article]:pb-7 sm:[&>article]:pb-0">
            {c.items.map((item, ii) => (
              <DishCard
                key={item.id}
                item={item}
                qty={qtyOf(item.id)}
                canOrder={isOpen}
                priority={ci === 0 && ii < 4}
                onAdd={() => addItem(item)}
                onQty={(n) => setQty(item.id, n)}
                onOpen={() => setOpenItemId(item.id)}
              />
            ))}
          </div>
        </section>
      ))}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Photos from Wikimedia Commons ·{" "}
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
              "mx-auto flex w-full max-w-lg animate-rise items-center gap-3 rounded-xl px-3 py-2.5 text-left text-white shadow-xl shadow-black/20",
              blocked || !isOpen ? "bg-foreground" : "bg-brand",
            )}
          >
            <span className="relative grid size-9 place-items-center rounded-lg bg-white/15">
              <ShoppingBag className="size-5" />
              <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-white text-[11px] font-bold text-brand">{count}</span>
            </span>
            <span className="flex-1 leading-tight">
              <span className="block text-xs text-white/80">
                {count} {count === 1 ? "item" : "items"}
                {blocked ? " · check cart" : ""}
              </span>
              <span className="block text-base font-bold tabular">{formatRupees(totalPaise)}</span>
            </span>
            <span className="inline-flex items-center gap-0.5 text-sm font-bold">
              View cart <ChevronRight className="size-4" />
            </span>
          </button>
        </div>
      )}

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} items={data?.items} isOpen={isOpen} closedMessage={settings?.closedMessage ?? null} />
      <DishSheet
        item={openItem}
        qty={openItem ? qtyOf(openItem.id) : 0}
        canOrder={isOpen}
        onClose={() => setOpenItemId(null)}
        onAdd={() => openItem && addItem(openItem)}
        onQty={(n) => openItem && setQty(openItem.id, n)}
        pairings={pairings}
        qtyOf={qtyOf}
        onAddPairing={(p) => {
          if (addItem(p)) toast.success(`${p.name} added`);
        }}
      />
    </div>
  );
}
