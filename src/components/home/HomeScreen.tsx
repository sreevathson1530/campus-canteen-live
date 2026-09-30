"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, BellRing, Clock3, Flame, MapPin, ReceiptText, ShieldCheck, Timer, UtensilsCrossed, Wallet } from "lucide-react";
import type { MenuSnapshot } from "@/lib/menu/service";
import type { MenuItemDTO } from "@/lib/realtime/events";
import type { Pulse } from "@/lib/pulse";
import { usePulse } from "@/hooks/usePulse";
import { formatRupees } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/shared/Brand";
import { InstallApp } from "@/components/shared/InstallApp";
import { DishImage } from "@/components/menu/DishImage";
import { VegMark } from "@/components/menu/VegMark";

const PERKS = [
  { icon: Timer, title: "No queue", body: "Order ahead and walk straight to the counter." },
  { icon: Flame, title: "Made fresh", body: "Cooking starts only after you order." },
  { icon: Wallet, title: "Pay at pickup", body: "Cash or UPI when you collect. No online payment." },
];

const STEPS = [
  { icon: UtensilsCrossed, title: "Choose your food", body: "Browse the menu and add dishes to your cart." },
  { icon: ShieldCheck, title: "Confirm with a code", body: "We email you a 4-digit code to confirm the order." },
  { icon: BellRing, title: "Track it live", body: "Watch your order go from placed to ready." },
  { icon: ReceiptText, title: "Collect with your token", body: "Show the token at the counter. The bill is emailed to you." },
];

export function HomeScreen({ menu, initialPulse, firstName }: { menu: MenuSnapshot; initialPulse: Pulse; firstName: string | null }) {
  const { data: pulse = initialPulse } = usePulse(initialPulse);
  const signedIn = firstName !== null;
  const orderHref = signedIn ? "/menu" : "/register";

  const popular = useMemo(() => {
    const byId = new Map(menu.items.map((i) => [i.id, i]));
    const sold = pulse.popular.map((p) => byId.get(p.id)).filter((i): i is MenuItemDTO => !!i);
    const extra = menu.items.filter((i) => i.tags.includes("bestseller") && !sold.includes(i));
    return [...sold, ...extra].slice(0, 8);
  }, [pulse.popular, menu.items]);

  const categories = menu.categories
    .map((c) => ({ ...c, items: menu.items.filter((i) => i.categoryId === c.id) }))
    .filter((c) => c.items.length > 0);
  const hero = menu.items.find((i) => i.imageUrl?.includes("chicken-burger")) ?? menu.items.find((i) => i.imageUrl);

  return (
    <div className="min-h-dvh bg-card">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-brand text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 pt-[env(safe-area-inset-top)] sm:px-6">
          <Wordmark onBrand className="text-base" />
          <nav className="flex items-center gap-1 text-sm font-semibold">
            <Link href={signedIn ? "/orders" : "/login"} className="rounded-md px-3 py-2 text-white/90 hover:bg-white/10">
              {signedIn ? "My orders" : "Sign in"}
            </Link>
            <Link href={orderHref} className="rounded-md bg-white px-3.5 py-2 font-bold text-brand hover:bg-white/90">
              Order now
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand to-brand-dark text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 pt-6 pb-16 sm:px-6 md:grid-cols-2 md:gap-10 md:pt-14 md:pb-24">
          <div>
            <p role="status" className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
              <span className={cn("size-2 rounded-full", pulse.isOpen ? "bg-[#4ade80]" : "bg-white/60")} />
              {pulse.isOpen ? `Open now · ready in about ${pulse.waitMinutes} min` : "Closed right now"}
            </p>
            <h1 className="mt-4 text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl">
              {signedIn ? `Welcome back, ${firstName}.` : "Pizzas, burgers and coffee."}
              <br />
              No waiting in line.
            </h1>
            <p className="mt-3 max-w-md text-base text-white/85">Order from your phone and pick it up hot when your token is called.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={orderHref} className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-brand shadow-sm hover:bg-white/90">
                {signedIn ? "Order now" : "Start your order"} <ArrowRight className="size-4" />
              </Link>
              {!signedIn && (
                <Link href="/login" className="rounded-lg border border-white/50 px-6 py-3 font-semibold hover:bg-white/10">
                  Sign in
                </Link>
              )}
              <InstallApp />
            </div>
          </div>
          {hero && <DishImage name={hero.name} src={hero.imageUrl} priority className="aspect-[4/3] w-full rounded-2xl shadow-xl ring-4 ring-white/15" />}
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Perks: cards that overlap the hero */}
        <ul className="relative -mt-9 grid gap-3 sm:grid-cols-3 md:-mt-12">
          {PERKS.map((p) => (
            <li key={p.title} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-md shadow-black/5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                <p.icon className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-sm text-muted-foreground">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Categories */}
        <section className="py-10" aria-labelledby="cats-h">
          <h2 id="cats-h" className="text-2xl font-bold">
            Explore the menu
          </h2>
          <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={orderHref} className="group block text-center">
                  <DishImage
                    name={c.name}
                    src={c.items[0]?.imageUrl ?? null}
                    className="aspect-square w-full rounded-full shadow-md ring-2 ring-transparent ring-offset-2 transition group-hover:scale-105 group-hover:ring-brand"
                  />
                  <p className="mt-2 text-sm leading-tight font-semibold group-hover:text-brand">{c.name}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Bestsellers */}
        {popular.length > 0 && (
          <section className="border-t py-10" aria-labelledby="popular-h">
            <div className="flex items-end justify-between gap-4">
              <h2 id="popular-h" className="text-2xl font-bold">
                Bestsellers
              </h2>
              <Link href={orderHref} className="shrink-0 text-sm font-bold text-brand hover:underline">
                View full menu
              </Link>
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {popular.map((item) => (
                <li key={item.id} className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <Link href={orderHref} className="block">
                    <div className="overflow-hidden"><DishImage name={item.name} src={item.imageUrl} className="aspect-[4/3] w-full transition duration-500 group-hover:scale-105" /></div>
                    <div className="p-3">
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        <VegMark isVeg={item.isVeg} />
                        <span className="truncate">{item.name}</span>
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular">{formatRupees(item.pricePaise)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* How it works */}
        <section className="border-t py-10" aria-labelledby="how-h">
          <h2 id="how-h" className="text-2xl font-bold">
            How it works
          </h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border bg-card p-5">
                <span className="absolute top-4 right-4 grid size-7 place-items-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
                <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand">
                  <s.icon className="size-5" />
                </span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>
        {/* Call to action */}
        <section className="mb-10 flex flex-col items-start gap-4 rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-2xl font-bold">Hungry? Your order is a few taps away.</h2>
            <p className="mt-1 text-white/85">{pulse.isOpen ? `Ready in about ${pulse.waitMinutes} minutes.` : "We open again soon."}</p>
          </div>
          <Link href={orderHref} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-brand hover:bg-white/90">
            Order now <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-4 bg-[#1d1d1f] text-white/80">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div>
            <Wordmark onBrand className="text-base" />
            <p className="mt-3 max-w-xs text-sm">Freshly made fast food and coffee, ready when you arrive.</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-white">Visit us</p>
            <p className="mt-3 flex items-center gap-2">
              <Clock3 className="size-4 shrink-0" /> {menu.settings.openingHours}
            </p>
            <p className="mt-2 flex items-center gap-2">
              <MapPin className="size-4 shrink-0" /> {menu.settings.location}
            </p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-white">Quick links</p>
            <ul className="mt-3 grid gap-2">
              <li>
                <Link href={orderHref} className="hover:text-white hover:underline">
                  Order now
                </Link>
              </li>
              <li>
                <Link href={signedIn ? "/orders" : "/login"} className="hover:text-white hover:underline">
                  {signedIn ? "My orders" : "Sign in"}
                </Link>
              </li>
              <li>
                <Link href="/credits" className="hover:text-white hover:underline">
                  Photo credits
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="border-t border-white/10 px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] text-center text-xs text-white/60">
          © {menu.settings.canteenName}
        </p>
      </footer>
    </div>
  );
}
