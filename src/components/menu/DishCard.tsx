import { Plus } from "lucide-react";
import type { MenuItemDTO } from "@/lib/realtime/events";
import { formatRupees } from "@/lib/money";
import { cn } from "@/lib/utils";
import { stillFor } from "@/lib/dish-keys";
import { DishImage } from "./DishImage";
import { QtyStepper } from "./QtyStepper";
import { VegMark } from "./VegMark";
import { PrepTime, SpiceMeter, TagBadge } from "./badges";

export function isSoldOut(i: Pick<MenuItemDTO, "isAvailable" | "stock">): boolean {
  return !i.isAvailable || i.stock === 0;
}

export function DishCard({
  item,
  qty,
  onAdd,
  onQty,
  onOpen,
  canOrder,
  priority,
}: {
  item: MenuItemDTO;
  qty: number;
  onAdd: () => void;
  onQty: (q: number) => void;
  onOpen: () => void;
  canOrder: boolean;
  priority?: boolean;
}) {
  const soldOut = isSoldOut(item);
  const low = !soldOut && item.stock !== null && item.stock <= 5;
  const atStockLimit = item.stock !== null && qty >= item.stock;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border bg-card transition-shadow hover:shadow-lg hover:shadow-black/5",
        soldOut && "opacity-60 saturate-50",
      )}
    >
      <button type="button" onClick={onOpen} className="text-left" aria-label={`${item.name}, view in 3D`}>
        <DishImage name={item.name} src={item.imageUrl} still={stillFor(item.modelKey)} priority={priority} className="aspect-[5/4] w-full" />
        {soldOut || low ? (
          <span
            className={cn(
              "absolute top-2.5 left-2.5 rounded-full px-2 py-0.5 text-[11px] font-bold",
              soldOut ? "bg-foreground text-background" : "bg-chili text-white",
            )}
          >
            {soldOut ? "Sold out" : `Only ${item.stock} left`}
          </span>
        ) : (
          <TagBadge tags={item.tags} className="absolute top-2.5 left-2.5" />
        )}
        <span className="absolute top-2.5 right-2.5 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase backdrop-blur">
          3D
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-1 p-3 pt-2.5">
        <div className="flex items-start gap-1.5">
          <VegMark isVeg={item.isVeg} className="mt-1" />
          <h3 className="line-clamp-2 font-sans text-[15px] leading-tight font-bold">{item.name}</h3>
        </div>
        {item.description && <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>}
        <div className="flex items-center gap-2.5 pt-0.5">
          <PrepTime minutes={item.prepMinutes} />
          {item.spiceLevel > 0 && <SpiceMeter level={item.spiceLevel} />}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <span className="font-display text-lg font-extrabold tabular">{formatRupees(item.pricePaise)}</span>
          {soldOut ? (
            <span className="text-xs font-semibold text-muted-foreground">Unavailable</span>
          ) : qty > 0 ? (
            <QtyStepper size="sm" value={qty} onChange={onQty} label={item.name} disabledPlus={atStockLimit} />
          ) : (
            <button
              type="button"
              onClick={onAdd}
              disabled={!canOrder}
              className="grid size-9 place-items-center rounded-full bg-leaf text-paper shadow-sm transition active:scale-90 disabled:bg-muted disabled:text-muted-foreground"
              aria-label={`Add ${item.name}`}
            >
              <Plus className="size-5" strokeWidth={2.6} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
