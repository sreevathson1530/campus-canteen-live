import dynamic from "next/dynamic";
import { useState } from "react";
import { Camera, Clock, Rotate3d } from "lucide-react";
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
}: {
  item: MenuItemDTO | null;
  qty: number;
  onClose: () => void;
  onAdd: () => void;
  onQty: (q: number) => void;
  canOrder: boolean;
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
            <div className="relative mx-4 mt-2 aspect-[5/4] max-h-[44dvh] overflow-hidden rounded-3xl">
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
            <DrawerHeader className="pb-1 text-left">
              <div className="flex items-start justify-between gap-3">
                <DrawerTitle className="font-display text-2xl leading-tight font-extrabold">{item.name}</DrawerTitle>
                <span className="font-display text-2xl font-extrabold tabular">{formatRupees(item.pricePaise)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <VegMark isVeg={item.isVeg} withLabel />
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> ~{item.prepMinutes} min
                </span>
                {soldOut ? (
                  <span className="font-semibold text-chili">Sold out</span>
                ) : item.stock !== null && item.stock <= 5 ? (
                  <span className="font-semibold text-[#9a6a08] dark:text-turmeric">Only {item.stock} left</span>
                ) : null}
              </div>
              <DrawerDescription className="pt-1 text-[15px] text-foreground/80">{item.description}</DrawerDescription>
            </DrawerHeader>
            <div className="flex items-center gap-3 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
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
