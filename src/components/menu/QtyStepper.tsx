import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** "− 2 +" control in the brand colour, the same shape as the ADD button it replaces. */
export function QtyStepper({
  value,
  onChange,
  max = 10,
  label,
  size = "md",
  disabledPlus = false,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  label: string;
  size?: "sm" | "md";
  disabledPlus?: boolean;
}) {
  const btn = cn("grid place-items-center text-white transition active:scale-90 disabled:opacity-40", size === "sm" ? "h-9 w-8" : "h-11 w-10");
  return (
    <div className="inline-flex items-center rounded-lg bg-brand shadow-sm" role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} aria-label={`Remove one ${label}`}>
        <Minus className="size-4" strokeWidth={2.8} />
      </button>
      <span className="min-w-6 text-center text-sm font-bold text-white tabular" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={value >= max || disabledPlus}
        aria-label={`Add one more ${label}`}
      >
        <Plus className="size-4" strokeWidth={2.8} />
      </button>
    </div>
  );
}
