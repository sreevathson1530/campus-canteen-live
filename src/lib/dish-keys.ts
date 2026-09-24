/** Procedural 3D models available for menu items (see src/components/food3d/dishes.tsx). */
export const DISH_MODELS: { key: string; label: string }[] = [
  { key: "idli", label: "Idli" },
  { key: "masala-dosa", label: "Masala dosa" },
  { key: "pongal", label: "Pongal" },
  { key: "poori", label: "Poori" },
  { key: "veg-meals", label: "Meals" },
  { key: "curd-rice", label: "Curd rice" },
  { key: "lemon-rice", label: "Lemon rice" },
  { key: "biryani", label: "Biryani" },
  { key: "egg-fried-rice", label: "Fried rice" },
  { key: "samosa", label: "Samosa" },
  { key: "veg-puff", label: "Veg puff" },
  { key: "egg-puff", label: "Egg puff" },
  { key: "onion-bajji", label: "Bajji / fritters" },
  { key: "filter-coffee", label: "Filter coffee" },
  { key: "tea", label: "Tea" },
  { key: "lime-juice", label: "Juice" },
];

export const stillFor = (key: string | null | undefined) => (key ? `/stills/${key}.webp` : null);

/** Keys that have a real, freely licensed photo in public/photos (credits in photo-credits.ts). */
const PHOTO_KEYS = new Set(DISH_MODELS.map((m) => m.key));
export const photoFor = (key: string | null | undefined) => (key && PHOTO_KEYS.has(key) ? `/photos/${key}.webp` : null);
