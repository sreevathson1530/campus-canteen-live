import dynamic from "next/dynamic";
import { useState } from "react";
import { AlertTriangle, Camera, Check, Clock, Flame, Plus, Rotate3d, Zap } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import type { MenuItemDTO } from "@/lib/realtime/events";
import { formatRupees } from "@/lib/money";
import { stillFor } from "@/lib/dish-keys";
import { cn } from "@/lib/utils";
import { DishImage } from "./DishImage";
import { isSoldOut } from "./DishCard";
import { QtyStepper } from "./QtyStepper";
import { VegMark } from "./VegMark";
import { SPICE_LABELS, SpiceMeter, TagBadge } from "./badges";

// The live 3D viewer (three.js) loads only when the 3D view is chosen, never on the menu grid.
const DishViewer = dynamic(() => import("@/components/food3d/DishViewer").then((m) => m.DishViewer), {
  ssr: false,
  loading: () => null,
});

type View = "photo" | "3d";

export function DishSheet({
  item,
  qty,
  onClose,
  onAdd,
  onQty,
  canOrder,
  pairings = [],
  qtyOf = () => 0,
  onAddPairing,
}: {
  item: MenuItemDTO | null;
  qty: number;
  onClose: () => void;
  onAdd: () => void;
  onQty: (q: number) => void;
  canOrder: boolean;
  /** Dishes that go well with this one (already resolved from item.pairsWith). */
  pairings?: MenuItemDTO[];
  qtyOf?: (id: string) => number;
  onAddPairing?: (item: MenuItemDTO) => void;
}) {
  const [view, setView] = useState<View>("photo");
  const soldOut = item ? isSoldOut(item) : false;
  const has3d = !!item?.modelKey;
  const hasPhoto = !!item?.imageUrl;
  const shown: View = !hasPhoto && has3d ? "3d" : view;

  return (
    <Drawer
      open={!!item}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setView("photo");
        }
      }}
    >
      <DrawerContent className="mx-auto max-h-[94dvh] max-w-lg rounded-t-[1.75rem]">
        {item && (
          <>
            <div className="relative mx-4 mt-2 aspect-[5/4] max-h-[38dvh] shrink-0 overflow-hidden rounded-3xl">
              {shown === "photo" ? (
                <DishImage name={item.name} src={item.imageUrl} still={stillFor(item.modelKey)} priority className="absolute inset-0" />
              ) : (
                <>
                  <DishImage name={item.name} src={null} still={stillFor(item.modelKey)} priority className="absolute inset-0" />
                  <DishViewer modelKey={item.modelKey!} className="absolute inset-0" />
                </>
              )}
              {has3d && hasPhoto && (
                <div
                  role="radiogroup"
                  aria-label="View"
                  className="absolute top-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-background/85 p-1 shadow-sm backdrop-blur"
                >
                  {(
                    [
                      ["photo", "Photo", Camera],
                      ["3d", "3D", Rotate3d],
                    ] as const
                  ).map(([v, label, Icon]) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={shown === v}
                      onClick={() => setView(v)}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors",
                        shown === v ? "bg-foreground text-background" : "text-muted-foreground",
                      )}
                    >
                      <Icon className="size-3.5" /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <DrawerHeader className="pb-1 text-left">
                <TagBadge tags={item.tags} className="self-start" />
                <div className="flex items-start justify-between gap-3">
                  <DrawerTitle className="font-display text-2xl leading-tight font-extrabold">{item.name}</DrawerTitle>
                  <span className="font-display text-2xl font-extrabold tabular">{formatRupees(item.pricePaise)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <VegMark isVeg={item.isVeg} withLabel />
                  {soldOut ? (
                    <span className="font-semibold text-chili">Sold out</span>
                  ) : item.stock !== null && item.stock <= 5 ? (
                    <span className="font-semibold text-[#9a6a08] dark:text-turmeric">Only {item.stock} left</span>
                  ) : null}
                </div>
                <DrawerDescription className="pt-1 text-[15px] text-foreground/80">{item.description}</DrawerDescription>
              </DrawerHeader>

              {/* Quick facts */}
              <dl className="mx-4 grid grid-cols-3 divide-x rounded-2xl border bg-muted/40 text-center">
                <Fact icon={Clock} label="Ready in">
                  <span className="font-display text-lg leading-none font-extrabold">~{item.prepMinutes} min</span>
                </Fact>
                <Fact icon={Flame} label="Spice">
                  <span className="flex flex-col items-center gap-0.5">
                    <SpiceMeter level={item.spiceLevel} />
                    <span aria-hidden className="text-xs font-semibold">
                      {SPICE_LABELS[item.spiceLevel] ?? SPICE_LABELS[0]}
                    </span>
                  </span>
                </Fact>
                <Fact icon={Zap} label="Energy">
                  <span className="font-display text-lg leading-none font-extrabold">
                    {item.calories !== null ? (
                      <>
                        {item.calories}
                        <span className="ml-0.5 font-sans text-xs font-semibold text-muted-foreground">kcal</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </Fact>
              </dl>

              {item.ingredients.length > 0 && (
                <section className="mx-4 mt-4" aria-labelledby="ing-h">
                  <h3 id="ing-h" className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    What&apos;s inside
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {item.ingredients.map((x) => (
                      <li key={x} className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
                        {x}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {item.allergens.length > 0 && (
                <p className="mx-4 mt-3 flex items-start gap-2 rounded-2xl bg-turmeric-soft px-3 py-2.5 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#9a6a08] dark:text-turmeric" />
                  <span>
                    <span className="font-bold">Contains:</span> {item.allergens.join(", ")}
                  </span>
                </p>
              )}

              {pairings.length > 0 && (
                <section className="mt-5" aria-labelledby="pair-h">
                  <h3 id="pair-h" className="mx-4 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    Goes well with
                  </h3>
                  <ul className="relative mt-2 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                    {pairings.map((p) => {
                      const inCart = qtyOf(p.id) > 0;
                      const unavailable = isSoldOut(p) || !canOrder;
                      return (
                        <li key={p.id} className="flex w-60 shrink-0 items-center gap-3 rounded-2xl border bg-card p-2">
                          <DishImage name={p.name} src={p.imageUrl} still={stillFor(p.modelKey)} className="size-14 shrink-0 rounded-xl" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{p.name}</p>
                            <p className="text-sm text-muted-foreground tabular">{formatRupees(p.pricePaise)}</p>
                          </div>
                          <button
                            type="button"
                            disabled={unavailable || inCart}
                            onClick={() => onAddPairing?.(p)}
                            aria-label={inCart ? `${p.name} is in your cart` : `Add ${p.name}`}
                            className={cn(
                              "grid size-9 shrink-0 place-items-center rounded-full transition active:scale-90",
                              inCart ? "bg-leaf-soft text-leaf" : "bg-leaf text-paper disabled:bg-muted disabled:text-muted-foreground",
                            )}
                          >
                            {inCart ? <Check className="size-4" strokeWidth={3} /> : <Plus className="size-5" strokeWidth={2.6} />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
              <div className="h-3" />
            </div>

            <div className="flex items-center gap-3 border-t px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
              {qty > 0 && (
                <QtyStepper value={qty} onChange={onQty} label={item.name} disabledPlus={item.stock !== null && qty >= item.stock} />
              )}
              <Button size="xl" className="flex-1" disabled={soldOut || !canOrder} onClick={qty > 0 ? onClose : onAdd}>
                {soldOut ? "Sold out" : qty > 0 ? "Done" : `Add · ${formatRupees(item.pricePaise)}`}
              </Button>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Fact({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="px-2 py-3">
      <dt className="flex items-center justify-center gap-1 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3" /> {label}
      </dt>
      <dd className="mt-1.5 flex justify-center">{children}</dd>
    </div>
  );
}
