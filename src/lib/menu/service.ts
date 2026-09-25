import { prisma } from "../db";
import { apiError } from "../api";
import { toMenuItemDTO } from "../dto";
import { emitMenuChanged, emitMenuItemUpdated } from "../realtime/emitters";
import { getSettings, toSettingsDTO, type SettingsDTO } from "../settings";
import type { MenuItemDTO } from "../realtime/events";
import type { z } from "zod";
import type { categorySchema, itemPatchSchema, itemSchema } from "../validators";

export interface CategoryDTO {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuSnapshot {
  categories: CategoryDTO[];
  items: MenuItemDTO[];
  settings: SettingsDTO;
}

/** Public menu: categories plus available and sold-out items (archived ones are hidden), plus settings. */
export async function getMenu(): Promise<MenuSnapshot> {
  const [categories, items, settings] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.menuItem.findMany({ where: { isArchived: false }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    getSettings(),
  ]);
  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder })),
    items: items.map(toMenuItemDTO),
    settings: toSettingsDTO(settings),
  };
}

export async function updateStock(id: string, input: { isAvailable?: boolean; stock?: number | null }): Promise<MenuItemDTO> {
  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing || existing.isArchived) apiError("NOT_FOUND", "Item not found");
  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(input.isAvailable !== undefined && { isAvailable: input.isAvailable }),
      ...(input.stock !== undefined && { stock: input.stock }),
    },
  });
  const dto = toMenuItemDTO(item);
  await emitMenuItemUpdated(dto);
  return dto;
}

// ---------- Admin: categories ----------

export async function listCategoriesAdmin() {
  const cats = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { items: { where: { isArchived: false } } } } },
  });
  return cats.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder, itemCount: c._count.items }));
}

export async function createCategory(input: z.infer<typeof categorySchema>) {
  const exists = await prisma.category.findUnique({ where: { name: input.name } });
  if (exists) apiError("VALIDATION_ERROR", "A category with that name already exists");
  const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const c = await prisma.category.create({
    data: { name: input.name, sortOrder: input.sortOrder ?? (max._max.sortOrder ?? -1) + 1 },
  });
  await emitMenuChanged("category-created");
  return c;
}

export async function updateCategory(id: string, input: Partial<z.infer<typeof categorySchema>>) {
  const c = await prisma.category.update({ where: { id }, data: input }).catch(() => apiError("NOT_FOUND", "Category not found"));
  await emitMenuChanged("category-updated");
  return c;
}

/** Deletes a category only if it has no items at all (archived items still reference it). */
export async function deleteCategory(id: string) {
  const count = await prisma.menuItem.count({ where: { categoryId: id } });
  if (count > 0) apiError("VALIDATION_ERROR", "Move or archive this category's items first");
  await prisma.category.delete({ where: { id } }).catch(() => apiError("NOT_FOUND", "Category not found"));
  await emitMenuChanged("category-deleted");
}

export async function reorderCategories(ids: string[]) {
  await prisma.$transaction(ids.map((id, i) => prisma.category.update({ where: { id }, data: { sortOrder: i } })));
  await emitMenuChanged("categories-reordered");
}

// ---------- Admin: items ----------

export async function listItemsAdmin() {
  const items = await prisma.menuItem.findMany({ where: { isArchived: false }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return items.map((i) => ({ ...toMenuItemDTO(i), prepMinutes: i.prepMinutes }));
}

export async function createItem(input: z.infer<typeof itemSchema>) {
  const cat = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!cat) apiError("VALIDATION_ERROR", "Choose a category");
  const item = await prisma.menuItem.create({ data: input });
  await emitMenuChanged("item-created");
  return toMenuItemDTO(item);
}

export async function updateItem(id: string, input: z.infer<typeof itemPatchSchema>) {
  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing || existing.isArchived) apiError("NOT_FOUND", "Item not found");
  const item = await prisma.menuItem.update({ where: { id }, data: input });
  const dto = toMenuItemDTO(item);
  // A category or order change reshapes the menu; everything else is a single-item patch.
  if (input.categoryId !== undefined && input.categoryId !== existing.categoryId) await emitMenuChanged("item-moved");
  else await emitMenuItemUpdated(dto);
  return dto;
}

/** Deleting archives: hidden from the menu, kept for order history. */
export async function archiveItem(id: string) {
  await prisma.menuItem.update({ where: { id }, data: { isArchived: true, isAvailable: false } }).catch(() => apiError("NOT_FOUND", "Item not found"));
  await emitMenuChanged("item-archived");
}

export async function reorderItems(ids: string[]) {
  await prisma.$transaction(ids.map((id, i) => prisma.menuItem.update({ where: { id }, data: { sortOrder: i } })));
  await emitMenuChanged("items-reordered");
}
