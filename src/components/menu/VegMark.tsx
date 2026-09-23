import { cn } from "@/lib/utils";

/** Indian veg / non-veg symbol plus a text label, so it never relies on colour alone. */
export function VegMark({ isVeg, withLabel = false, className }: { isVeg: boolean; withLabel?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        aria-hidden
        className={cn(
          "grid size-3.5 shrink-0 place-items-center rounded-[3px] border-[1.5px]",
          isVeg ? "border-[#2f7a4f]" : "border-chili",
        )}
      >
        {isVeg ? (
          <span className="size-1.5 rounded-full bg-[#2f7a4f]" />
        ) : (
          <span className="size-0 border-x-[3.5px] border-b-[6px] border-x-transparent border-b-chili" />
        )}
      </span>
      <span className={cn(withLabel ? "text-xs font-medium text-muted-foreground" : "sr-only")}>{isVeg ? "Veg" : "Non-veg"}</span>
    </span>
  );
}
