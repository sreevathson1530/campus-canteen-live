import type { MenuItemDTO } from "@/lib/realtime/events";
import { formatRupees } from "@/lib/money";
import { cn } from "@/lib/utils";
import { DishImage } from "./DishImage";
import { QtyStepper } from "./QtyStepper";
import { VegMark } from "./VegMark";
import { SpiceMeter, TagLabel } from "./badges";

export function isSoldOut(i: Pick<MenuItemDTO, "isAvailable" | "stock">): boolean {
  return !i.isAvailable || i.stock === 0;
}

/** ADD button that turns into a − n + stepper once the dish is in the cart. */
export function AddControl({
  item,
  qty,
  onAdd,
  onQty,
  canOrder,
  className,
}: {
  item: MenuItemDTO;
  qty: number;
  onAdd: () => void;
  onQty: (q: number) => void;
  canOrder: boolean;
  className?: string;
}) {
  if (isSoldOut(item)) {
    return <span className={cn("rounded-lg border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground", className)}>Sold out</span>;
  }
  if (qty > 0) {
    return (
      <span className={className}>
        <QtyStepper size="sm" value={qty} onChange={onQty} label={item.name} disabledPlus={item.stock !== null && qty >= item.stock} />
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={!canOrder}
      aria-label={`Add ${item.name}`}
      className={cn(
        "h-9 rounded-lg border border-brand bg-card px-5 text-sm font-bold tracking-wide text-brand shadow-sm transition hover:bg-brand hover:text-white active:scale-95 disabled:border-border disabled:text-muted-foreground disabled:hover:bg-card",
        className,
      )}
    >
      ADD
    </button>
  );
}

/**
 * One dish. On phones it is a row (text left, photo right, ADD under the photo); from `sm` up it is
 * a card with the photo on top.
 */
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

  return (
    <article
      className={cn(
        "group/card flex gap-3 bg-card p-4 transition sm:flex-col sm:gap-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:p-0 sm:shadow-sm sm:hover:-translate-y-0.5 sm:hover:shadow-lg",
        soldOut && "opacity-60",
      )}
    >
      {/* Photo + ADD (right on phones, top on larger screens) */}
      <div className="relative order-2 w-[7.5rem] shrink-0 sm:order-1 sm:w-full">
        <button type="button" onClick={onOpen} className="block w-full overflow-hidden rounded-xl sm:rounded-none" aria-label={`${item.name}, view details`}>
          <DishImage name={item.name} src={item.imageUrl} priority={priority} className="aspect-square w-full transition duration-500 sm:aspect-[4/3] sm:group-hover/card:scale-105" />
        </button>
        <AddControl
          item={item}
          qty={qty}
          onAdd={onAdd}
          onQty={onQty}
          canOrder={canOrder}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap sm:hidden"
        />
      </div>

      <div className="order-1 flex min-w-0 flex-1 flex-col sm:order-2 sm:p-4">
        <div className="flex items-center gap-2">
          <VegMark isVeg={item.isVeg} />
          <TagLabel tags={item.tags} />
        </div>
        <h3 className="mt-1 text-base leading-snug font-semibold">
          <button type="button" onClick={onOpen} className="text-left hover:underline">
            {item.name}
          </button>
        </h3>
        <p className="mt-0.5 font-semibold tabular">{formatRupees(item.pricePaise)}</p>
        {item.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {item.spiceLevel > 0 && <SpiceMeter level={item.spiceLevel} />}
          {low && <span className="font-semibold text-chili">Only {item.stock} left</span>}
        </div>
        <div className="mt-auto hidden pt-3 sm:block">
          <AddControl item={item} qty={qty} onAdd={onAdd} onQty={onQty} canOrder={canOrder} className="w-full" />
        </div>
      </div>
    </article>
  );
}
