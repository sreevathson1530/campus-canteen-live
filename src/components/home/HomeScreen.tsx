"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BellRing, Clock3, Flame, MapPin, ReceiptText, ShieldCheck, Soup, Timer, Users } from "lucide-react";
import type { MenuSnapshot } from "@/lib/menu/service";
import type { MenuItemDTO } from "@/lib/realtime/events";
import type { Pulse } from "@/lib/pulse";
import { usePulse } from "@/hooks/usePulse";
import { formatRupees } from "@/lib/money";
import { cn } from "@/lib/utils";
import { TokenCoin, Wordmark } from "@/components/shared/Brand";
import { DishImage } from "@/components/menu/DishImage";
import { VegMark } from "@/components/menu/VegMark";

const DishViewer = dynamic(() => import("@/components/food3d/DishViewer").then((m) => m.DishViewer), { ssr: false });

const HERO_KEYS = ["masala-dosa", "biryani", "filter-coffee", "idli"];
const HERO_MS = 7000;

const STEPS = [
  { icon: Soup, title: "Pick your food", body: "Browse real photos, spin dishes in 3D, and add to cart." },
  { icon: ShieldCheck, title: "Confirm with a code", body: "A 4-digit SMS code keeps prank orders out." },
  { icon: BellRing, title: "Watch it cook", body: "Your token moves Placed → Preparing → Ready, live." },
  { icon: ReceiptText, title: "Collect & get a bill", body: "Show your token at the counter. The bill is saved." },
];

export function HomeScreen({ menu, initialPulse, firstName }: { menu: MenuSnapshot; initialPulse: Pulse; firstName: string | null }) {
  const { data: pulse = initialPulse } = usePulse(initialPulse);
  const signedIn = firstName !== null;
  const cta = signedIn ? { href: "/menu", label: "Open the menu" } : { href: "/register", label: "Start ordering" };
  const byId = useMemo(() => new Map(menu.items.map((i) => [i.id, i])), [menu.items]);

  const popular = useMemo(() => {
    const sold = pulse.popular.map((p) => byId.get(p.id)).filter((i): i is MenuItemDTO => !!i);
    const extra = menu.items.filter((i) => i.tags.includes("bestseller") && !sold.includes(i));
    return [...sold, ...extra].slice(0, 8);
  }, [pulse.popular, byId, menu.items]);

  const heroItems = useMemo(
    () => HERO_KEYS.map((k) => menu.items.find((i) => i.modelKey === k)).filter((i): i is MenuItemDTO => !!i),
    [menu.items],
  );
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    if (heroItems.length < 2) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroItems.length), HERO_MS);
    return () => clearInterval(t);
  }, [heroItems.length]);
  const hero = heroItems[heroIdx];

  const categories = menu.categories
    .map((c) => ({ ...c, items: menu.items.filter((i) => i.categoryId === c.id) }))
    .filter((c) => c.items.length > 0);

  return (
    <div className="min-h-dvh bg-background">
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-[#151412] text-paper">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-32 size-[34rem] rounded-full bg-[radial-gradient(circle,rgba(227,162,26,.35)_0%,transparent_65%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -left-40 size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(31,94,59,.55)_0%,transparent_65%)]"
        />

        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2 sm:px-6">
          <Wordmark className="text-lg text-paper" />
          <nav className="flex items-center gap-1 text-sm font-semibold">
            {signedIn ? (
              <Link href="/orders" className="rounded-full px-3 py-2 text-paper/80 hover:text-paper">
                My orders
              </Link>
            ) : (
              <Link href="/login" className="rounded-full px-3 py-2 text-paper/80 hover:text-paper">
                Sign in
              </Link>
            )}
            <Link href={cta.href} className="rounded-full bg-turmeric px-4 py-2 font-bold text-[#3a2a05] hover:brightness-105">
              {signedIn ? "Menu" : "Join"}
            </Link>
          </nav>
        </header>

        <div className="relative mx-auto grid max-w-6xl gap-2 px-4 pt-6 pb-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:pt-12 lg:pb-20">
          <div>
            <LiveStatus pulse={pulse} />
            <h1 className="mt-4 font-display text-[2.9rem] leading-[0.92] font-extrabold sm:text-7xl">
              {signedIn ? (
                <>
                  Hungry, {firstName}? <span className="text-turmeric">Skip the queue.</span>
                </>
              ) : (
                <>
                  Hot food. <span className="text-turmeric">Zero queue.</span>
                </>
              )}
            </h1>
            <p className="mt-4 max-w-md text-base text-paper/75 sm:text-lg">
              Order from your phone, confirm with a code, and watch your token go from kitchen to counter in real time.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={cta.href}
                className="group inline-flex items-center gap-2 rounded-2xl bg-turmeric px-5 py-3.5 font-bold text-[#3a2a05] shadow-lg shadow-turmeric/20 hover:brightness-105"
              >
                {cta.label}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#how" className="rounded-2xl px-4 py-3.5 font-semibold text-paper/80 ring-1 ring-paper/20 hover:text-paper hover:ring-paper/40">
                How it works
              </a>
            </div>
          </div>

          {/* Spinning 3D dish on a warm spotlight */}
          <div className="relative mx-auto aspect-square w-full max-w-[26rem]">
            <div aria-hidden className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_50%_45%,#3a342b_0%,#1d1a16_62%,transparent_72%)]" />
            {hero?.modelKey && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- still shown until WebGL draws */}
                <img
                  src={`/stills/${hero.modelKey}.webp`}
                  alt=""
                  className="absolute inset-[12%] size-[76%] object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.5)]"
                />
                <DishViewer
                  key={hero.modelKey}
                  modelKey={hero.modelKey}
                  interactive={false}
                  className="absolute inset-0 bg-none dark:bg-none"
                />
              </>
            )}
            {hero && (
              <Link
                href={cta.href}
                className="absolute bottom-2 left-1/2 flex -translate-x-1/2 animate-rise items-center gap-2 rounded-full bg-paper/10 py-1.5 pr-4 pl-2 text-sm backdrop-blur-md ring-1 ring-paper/15 hover:bg-paper/15"
                key={hero.id}
              >
                <VegMark isVeg={hero.isVeg} />
                <span className="font-semibold">{hero.name}</span>
                <span className="font-bold text-turmeric tabular">{formatRupees(hero.pricePaise)}</span>
              </Link>
            )}
            <TokenCoin className="absolute top-2 right-0 size-20 text-[11px] sm:size-24 sm:text-[13px]" />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ---------- Live numbers ---------- */}
        <section aria-label="Right now at the canteen" className="relative -mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Timer} label="Wait if you order now" value={pulse.isOpen ? `~${pulse.waitMinutes} min` : "—"} tone={pulse.busy ? "chili" : "leaf"} />
          <Stat icon={Flame} label="Being cooked now" value={String(pulse.queueLength)} />
          <Stat icon={Users} label="Served today" value={String(pulse.servedToday)} />
          <Stat icon={Soup} label="Dishes on the menu" value={String(menu.items.length)} />
        </section>

        {/* ---------- Popular ---------- */}
        {popular.length > 0 && (
          <section className="mt-12" aria-labelledby="popular-h">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-chili uppercase">Trending on campus</p>
                <h2 id="popular-h" className="mt-1 font-display text-3xl font-extrabold">
                  Popular this week
                </h2>
              </div>
              <Link href={cta.href} className="shrink-0 text-sm font-bold text-leaf hover:underline">
                Full menu →
              </Link>
            </div>
            <ul className="relative -mx-4 mt-4 flex scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
              {popular.map((item, i) => (
                <li key={item.id} className="w-[46%] shrink-0 sm:w-auto">
                  <Link href={cta.href} className="group block">
                    <div className="relative">
                      <DishImage
                        name={item.name}
                        src={item.imageUrl}
                        still={item.modelKey ? `/stills/${item.modelKey}.webp` : null}
                        className="aspect-[4/5] rounded-3xl transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <span className="absolute top-2 left-2 grid size-8 place-items-center rounded-full bg-background/90 font-display text-sm font-extrabold backdrop-blur">
                        {i + 1}
                      </span>
                    </div>
                    <div className="mt-2 flex items-start gap-1.5">
                      <VegMark isVeg={item.isVeg} className="mt-1" />
                      <p className="flex-1 leading-tight font-bold">{item.name}</p>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      <span className="font-bold text-foreground tabular">{formatRupees(item.pricePaise)}</span> · {item.prepMinutes} min
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------- How it works ---------- */}
        <section id="how" className="mt-14 scroll-mt-6" aria-labelledby="how-h">
          <p className="text-xs font-bold tracking-[0.18em] text-chili uppercase">Four taps, no queue</p>
          <h2 id="how-h" className="mt-1 font-display text-3xl font-extrabold">
            How it works
          </h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative overflow-hidden rounded-3xl border bg-card p-5">
                <span aria-hidden className="absolute -top-3 -right-1 font-display text-8xl font-extrabold text-muted/70 select-none">
                  {i + 1}
                </span>
                <span className="relative grid size-11 place-items-center rounded-2xl bg-leaf-soft text-leaf">
                  <s.icon className="size-5" />
                </span>
                <h3 className="relative mt-4 text-lg font-extrabold">{s.title}</h3>
                <p className="relative mt-1 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- Categories ---------- */}
        <section className="mt-14" aria-labelledby="cats-h">
          <h2 id="cats-h" className="font-display text-3xl font-extrabold">
            Something for every hour
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={cta.href} className="group relative block aspect-[4/3] overflow-hidden rounded-3xl bg-muted">
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    {c.items.slice(0, 4).map((i) => (
                      <DishImage key={i.id} name={i.name} src={i.imageUrl} className="size-full transition-transform duration-500 group-hover:scale-105" />
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
                    <p className="font-display text-xl leading-none font-extrabold">{c.name}</p>
                    <p className="mt-1 text-xs font-semibold text-white/80">
                      {c.items.length} dishes · from {formatRupees(Math.min(...c.items.map((i) => i.pricePaise)))}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Visit ---------- */}
        <section className="mt-14 grid gap-3 lg:grid-cols-[1.4fr_1fr]" aria-label="Timings and location">
          <div className="relative overflow-hidden rounded-3xl bg-leaf p-6 text-paper sm:p-8">
            <svg className="pointer-events-none absolute inset-0 size-full opacity-10" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
              <path d="M-10 190 C 120 150, 260 90, 420 10" stroke="white" strokeWidth="2" fill="none" />
              {[0, 1, 2, 3, 4].map((i) => (
                <path key={i} d={`M${40 + i * 80} ${175 - i * 38} C ${60 + i * 80} ${200 - i * 30}, ${70 + i * 80} 210, ${80 + i * 80} 230`} stroke="white" strokeWidth="1.2" fill="none" />
              ))}
            </svg>
            <p className="relative text-xs font-bold tracking-[0.18em] text-turmeric uppercase">Visit us</p>
            <h2 className="relative mt-1 font-display text-3xl font-extrabold">{menu.settings.canteenName}</h2>
            <dl className="relative mt-5 grid gap-3 text-paper/90">
              <div className="flex items-center gap-3">
                <Clock3 className="size-5 shrink-0 text-turmeric" />
                <dt className="sr-only">Hours</dt>
                <dd className="font-semibold">{menu.settings.openingHours}</dd>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="size-5 shrink-0 text-turmeric" />
                <dt className="sr-only">Location</dt>
                <dd className="font-semibold">{menu.settings.location}</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col justify-between gap-5 rounded-3xl border bg-card p-6 sm:p-8">
            <div>
              <h2 className="font-display text-2xl font-extrabold">{signedIn ? "Your table is ready." : "Ready when you are."}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {signedIn ? "Pick something tasty and we'll start cooking." : "Sign up with your college email and mobile number. It takes a minute."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={cta.href} className="inline-flex items-center gap-2 rounded-2xl bg-leaf px-5 py-3 font-bold text-paper hover:brightness-110">
                {cta.label} <ArrowRight className="size-4" />
              </Link>
              {!signedIn && (
                <Link href="/login" className="rounded-2xl border px-5 py-3 font-semibold hover:bg-muted">
                  I have an account
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto mt-14 flex max-w-6xl flex-col gap-3 border-t px-4 pt-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Wordmark className="text-base text-foreground" />
        <p>
          Food photos from Wikimedia Commons ·{" "}
          <Link href="/credits" className="font-semibold underline-offset-4 hover:underline">
            Credits
          </Link>
        </p>
      </footer>
    </div>
  );
}

function LiveStatus({ pulse }: { pulse: Pulse }) {
  const tone = !pulse.isOpen ? "bg-chili" : pulse.busy ? "bg-turmeric" : "bg-[#4caa73]";
  const text = !pulse.isOpen ? "Closed right now" : pulse.busy ? `Busy · ~${pulse.waitMinutes} min wait` : `Open now · ~${pulse.waitMinutes} min wait`;
  return (
    <p role="status" className="inline-flex items-center gap-2 rounded-full bg-paper/10 px-3 py-1.5 text-sm font-semibold ring-1 ring-paper/15">
      <span className="relative flex size-2.5">
        {pulse.isOpen && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-70", tone)} />}
        <span className={cn("relative size-2.5 rounded-full", tone)} />
      </span>
      {text}
    </p>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Timer; label: string; value: string; tone?: "leaf" | "chili" }) {
  return (
    <div className="rounded-3xl border bg-card p-4 shadow-sm">
      <Icon className={cn("size-5", tone === "chili" ? "text-chili" : tone === "leaf" ? "text-leaf" : "text-muted-foreground")} />
      <p className="mt-3 font-display text-2xl leading-none font-extrabold tabular">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
