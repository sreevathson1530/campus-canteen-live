import { cn } from "@/lib/utils";

/** A flat token badge (kept for places that show a token number as a mark). */
export function TokenCoin({ value = "107", className, label = true }: { value?: string | number; className?: string; label?: boolean }) {
  return (
    <div aria-hidden className={cn("flex aspect-square flex-col items-center justify-center rounded-full bg-turmeric text-[#3a2a05]", className)}>
      {label && <span className="text-[0.55em] font-semibold tracking-[0.2em] uppercase opacity-80">Token</span>}
      <span className="text-[2em] leading-none font-bold tabular">{value}</span>
    </div>
  );
}

/** App logo: a small square with a "C", then the name. `onBrand` is the white version for the red header. */
export function Wordmark({ className, onBrand = false }: { className?: string; onBrand?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold tracking-tight", onBrand && "text-white", className)}>
      <span
        aria-hidden
        className={cn("grid size-8 place-items-center rounded-lg text-base font-extrabold", onBrand ? "bg-white text-brand" : "bg-brand text-white")}
      >
        C
      </span>
      <span>QuickCanteen</span>
    </span>
  );
}
