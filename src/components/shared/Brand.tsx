import { cn } from "@/lib/utils";

/** A brass token coin, the app's mark. */
export function TokenCoin({ value = "107", className, label = true }: { value?: string | number; className?: string; label?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center rounded-full text-[#3a2a05]",
        "bg-[radial-gradient(circle_at_35%_30%,#f6d98a_0%,#e3a21a_48%,#a8740c_100%)]",
        "shadow-[inset_0_0_0_5px_rgba(255,255,255,.18),inset_0_-8px_16px_rgba(0,0,0,.25),0_18px_40px_rgba(0,0,0,.28)]",
        className,
      )}
    >
      {label && <span className="text-[0.55em] font-bold uppercase tracking-[0.2em] opacity-80">Token</span>}
      <span className="font-display text-[2.2em] leading-none font-extrabold tabular">{value}</span>
    </div>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-extrabold tracking-tight", className)}>
      <TokenCoin value="C" label={false} className="size-7 text-[11px]" />
      <span>
        Canteen<span className="text-turmeric">.</span>live
      </span>
    </span>
  );
}
