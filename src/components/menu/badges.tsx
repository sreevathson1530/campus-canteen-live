import { Flame, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export const TAG_META: Record<string, { label: string; className: string; icon: typeof Star }> = {
  bestseller: { label: "Bestseller", className: "text-[#b45309]", icon: Star },
  new: { label: "New", className: "text-leaf", icon: Sparkles },
  "chef-special": { label: "Chef's special", className: "text-brand", icon: Flame },
};

export const SPICE_LABELS = ["Not spicy", "Mild", "Medium", "Hot"] as const;

/** The first known tag as small coloured text with an icon ("★ Bestseller"), or nothing. */
export function TagLabel({ tags, className }: { tags: string[]; className?: string }) {
  const tag = tags.find((t) => TAG_META[t]);
  if (!tag) return null;
  const m = TAG_META[tag];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", m.className, className)}>
      <m.icon className="size-3 fill-current" />
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
          <Flame key={n} className={cn("-mx-px size-3.5", n <= level ? "fill-chili text-chili" : "text-muted-foreground/35")} strokeWidth={2.2} />
        ))}
      </span>
      <span className={withLabel ? "text-xs font-semibold" : "sr-only"}>{SPICE_LABELS[level] ?? SPICE_LABELS[0]}</span>
    </span>
  );
}
