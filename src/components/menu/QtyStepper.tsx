import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const btn = cn(
    "grid place-items-center rounded-full text-leaf transition active:scale-90 disabled:opacity-35",
    size === "sm" ? "size-8" : "size-10",
  );
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-leaf-soft p-0.5" role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} aria-label={`Remove one ${label}`}>
        <Minus className="size-4" strokeWidth={2.6} />
      </button>
      <span className="min-w-5 text-center font-display text-base font-extrabold tabular" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={value >= max || disabledPlus}
        aria-label={`Add one more ${label}`}
      >
        <Plus className="size-4" strokeWidth={2.6} />
      </button>
    </div>
  );
}
