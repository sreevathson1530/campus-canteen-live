"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TILE_COLORS = ["#f3d9a4", "#dcebdf", "#f6dcd5", "#e9e1f3", "#d8e8f0", "#fbebc6"];

function tileColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TILE_COLORS[h % TILE_COLORS.length];
}

/**
 * Dish picture with a fallback chain: the real photo (full-bleed), then the rendered 3D still
 * (contained on a soft backdrop), then a coloured tile with the item's initial.
 */
export function DishImage({
  name,
  src,
  still,
  className,
  priority = false,
}: {
  name: string;
  /** Real photo (menu item imageUrl). */
  src: string | null;
  /** Rendered 3D still, used when there is no photo or it fails to load. */
  still?: string | null;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const candidates = [src, still].filter((u): u is string => !!u && !failed.has(u));
  const current = candidates[0] ?? null;
  const isPhoto = current !== null && current === src;

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden",
        !isPhoto &&
          "bg-[radial-gradient(circle_at_50%_42%,#ffffff_0%,#f3ecdd_62%,#e7dcc6_100%)] dark:bg-[radial-gradient(circle_at_50%_42%,#2e2a24_0%,#1f1c18_70%)]",
        className,
      )}
    >
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element -- small static WebP files; next/image adds no value here
        <img
          key={current}
          src={current}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed((f) => new Set(f).add(current))}
          className={cn(
            "size-full",
            isPhoto ? "object-cover" : "object-contain p-1 drop-shadow-[0_8px_10px_rgba(0,0,0,.18)]",
          )}
        />
      ) : (
        <span
          aria-hidden
          className="grid size-3/5 max-h-20 max-w-20 place-items-center rounded-2xl font-display text-3xl font-extrabold text-[#3a2a05]/70"
          style={{ background: tileColor(name) }}
        >
          {name.charAt(0)}
        </span>
      )}
    </div>
  );
}
