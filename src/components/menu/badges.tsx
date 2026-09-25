import { Flame, Sparkles, Star, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export const TAG_META: Record<string, { label: string; className: string; icon: typeof Star }> = {
  bestseller: { label: "Bestseller", className: "bg-turmeric text-[#3a2a05]", icon: Star },
  new: { label: "New", className: "bg-leaf text-paper", icon: Sparkles },
  "chef-special": { label: "Chef's special", className: "bg-chili text-white", icon: Flame },
};

export const SPICE_LABELS = ["Not spicy", "Mild", "Medium", "Hot"] as const;

/** The first known tag as a pill, or nothing. */
export function TagBadge({ tags, className }: { tags: string[]; className?: string }) {
  const tag = tags.find((t) => TAG_META[t]);
  if (!tag) return null;
  const m = TAG_META[tag];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm", m.className, className)}>
      <m.icon className="size-3" strokeWidth={2.6} />
      {m.label}
    </span>
  );
}

/** Three chillies, filled up to the level. Has a text label for screen readers. */
export function SpiceMeter({ level, className, withLabel = false }: { level: number; className?: string; withLabel?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span aria-hidden className="inline-flex">
        {[1, 2, 3].map((n) => (
          <Flame key={n} className={cn("size-3.5 -mx-px", n <= level ? "fill-chili text-chili" : "text-muted-foreground/35")} strokeWidth={2.2} />
        ))}
      </span>
      <span className={withLabel ? "text-xs font-semibold" : "sr-only"}>{SPICE_LABELS[level] ?? SPICE_LABELS[0]}</span>
    </span>
  );
}

export function PrepTime({ minutes, className }: { minutes: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground", className)}>
      <Timer className="size-3.5" /> {minutes} min
    </span>
  );
}
