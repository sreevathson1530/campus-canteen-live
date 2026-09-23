import dynamic from "next/dynamic";
import { Clock } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import type { MenuItemDTO } from "@/lib/realtime/events";
import { formatRupees } from "@/lib/money";
import { DishImage } from "./DishImage";
import { isSoldOut } from "./DishCard";
import { QtyStepper } from "./QtyStepper";
import { VegMark } from "./VegMark";

// The live 3D viewer (three.js) loads only when a dish is opened, never on the menu grid.
const DishViewer = dynamic(() => import("@/components/food3d/DishViewer").then((m) => m.DishViewer), {
  ssr: false,
  loading: () => null,
});

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
  const soldOut = item ? isSoldOut(item) : false;
  return (
    <Drawer open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto max-h-[94dvh] max-w-lg rounded-t-[1.75rem]">
        {item && (
          <>
            <div className="relative mx-4 mt-2 aspect-square max-h-[46dvh] overflow-hidden rounded-3xl">
              <DishImage name={item.name} src={item.imageUrl} priority className="absolute inset-0" />
              {item.modelKey && <DishViewer modelKey={item.modelKey} className="absolute inset-0" />}
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
