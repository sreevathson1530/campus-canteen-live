"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Archive, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ClientApiError } from "@/lib/client-api";
import { DISH_MODELS, stillFor } from "@/lib/dish-keys";
import { formatRupees } from "@/lib/money";
import type { MenuItemDTO } from "@/lib/realtime/events";
import { DishImage } from "@/components/menu/DishImage";
import { VegMark } from "@/components/menu/VegMark";
import { MENU_KEY } from "@/hooks/useLiveMenu";

type Category = { id: string; name: string; sortOrder: number; itemCount: number };
type Item = MenuItemDTO;

const CATS_KEY = ["admin-categories"] as const;
const ITEMS_KEY = ["admin-items"] as const;

const selectCls =
  "h-11 w-full rounded-xl border bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring";

interface Draft {
  id?: string;
  name: string;
  description: string;
  rupees: string;
  isVeg: boolean;
  categoryId: string;
  modelKey: string;
  prepMinutes: string;
  stock: string;
  isAvailable: boolean;
}

function toDraft(i: Item | null, categoryId: string): Draft {
  return i
    ? {
        id: i.id,
        name: i.name,
        description: i.description ?? "",
        rupees: String(i.pricePaise / 100),
        isVeg: i.isVeg,
        categoryId: i.categoryId,
        modelKey: i.modelKey ?? "",
        prepMinutes: String(i.prepMinutes),
        stock: i.stock === null ? "" : String(i.stock),
        isAvailable: i.isAvailable,
      }
    : { name: "", description: "", rupees: "", isVeg: true, categoryId, modelKey: "", prepMinutes: "5", stock: "", isAvailable: true };
}

export function MenuAdmin() {
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: CATS_KEY, queryFn: () => api<{ categories: Category[] }>("/api/admin/categories").then((r) => r.categories) });
  const items = useQuery({ queryKey: ITEMS_KEY, queryFn: () => api<{ items: Item[] }>("/api/admin/items").then((r) => r.items) });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState("");

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: CATS_KEY });
    void qc.invalidateQueries({ queryKey: ITEMS_KEY });
    void qc.invalidateQueries({ queryKey: MENU_KEY });
  };
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
      refresh();
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Something went wrong");
    }
  };

  async function saveDraft() {
    if (!draft) return;
    const pricePaise = Math.round(Number(draft.rupees) * 100);
    if (!draft.name.trim() || !Number.isFinite(pricePaise) || pricePaise < 100) {
      toast.error("Add a name and a price of at least ₹1");
      return;
    }
    const body = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      pricePaise,
      isVeg: draft.isVeg,
      categoryId: draft.categoryId,
      modelKey: draft.modelKey || null,
      imageUrl: stillFor(draft.modelKey),
      prepMinutes: Number(draft.prepMinutes) || 5,
      stock: draft.stock === "" ? null : Number(draft.stock),
      isAvailable: draft.isAvailable,
    };
    setSaving(true);
    await run(
      () => (draft.id ? api(`/api/admin/items/${draft.id}`, { method: "PATCH", body }) : api("/api/admin/items", { body })),
      draft.id ? "Item updated, live on every menu" : "Item added",
    );
    setSaving(false);
    setDraft(null);
  }

  function move<T extends { id: string }>(list: T[], idx: number, dir: -1 | 1, url: string) {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((x) => x.id);
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    void run(() => api(url, { body: { ids } }));
  }

  if (cats.isLoading || items.isLoading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  const categories = cats.data ?? [];
  const allItems = items.data ?? [];

  return (
    <div className="grid gap-6 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold">Menu</h1>
        <Button size="xl" onClick={() => setDraft(toDraft(null, categories[0]?.id ?? ""))} disabled={!categories.length}>
          <Plus /> Add item
        </Button>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newCat.trim().length < 2) return;
          void run(() => api("/api/admin/categories", { body: { name: newCat.trim() } }), "Category added").then(() => setNewCat(""));
        }}
      >
        <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name" className="h-11 rounded-xl" aria-label="New category name" />
        <Button type="submit" variant="outline" className="h-11 rounded-xl px-4" disabled={newCat.trim().length < 2}>
          Add category
        </Button>
      </form>

      {categories.map((c, ci) => {
        const list = allItems.filter((i) => i.categoryId === c.id).sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <section key={c.id} className="grid gap-2">
            <div className="flex items-center gap-1">
              <h2 className="mr-auto font-display text-xl font-extrabold">{c.name}</h2>
              <Button variant="ghost" size="icon-lg" aria-label={`Move ${c.name} up`} onClick={() => move(categories, ci, -1, "/api/admin/categories/reorder")} disabled={ci === 0}>
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={`Move ${c.name} down`}
                onClick={() => move(categories, ci, 1, "/api/admin/categories/reorder")}
                disabled={ci === categories.length - 1}
              >
                <ArrowDown />
              </Button>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={`Rename ${c.name}`}
                onClick={() => {
                  const name = window.prompt("Rename category", c.name);
                  if (name && name.trim().length >= 2) void run(() => api(`/api/admin/categories/${c.id}`, { method: "PATCH", body: { name: name.trim() } }));
                }}
              >
                <Pencil />
              </Button>
              {c.itemCount === 0 && (
                <Button variant="ghost" size="icon-lg" aria-label={`Delete ${c.name}`} onClick={() => run(() => api(`/api/admin/categories/${c.id}`, { method: "DELETE" }), "Category deleted")}>
                  <Trash2 />
                </Button>
              )}
            </div>
            {list.length === 0 && <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No items yet.</p>}
            <ul className="grid gap-2">
              {list.map((i, ii) => (
                <li key={i.id} className="flex items-center gap-3 rounded-2xl border bg-card p-2.5">
                  <DishImage name={i.name} src={i.imageUrl} className="size-14 shrink-0 rounded-xl" />
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDraft(toDraft(i, c.id))}>
                    <span className="flex items-center gap-1.5 font-bold">
                      <VegMark isVeg={i.isVeg} /> <span className="truncate">{i.name}</span>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatRupees(i.pricePaise)} · {i.stock === null ? "Unlimited" : `${i.stock} left`}
                      {!i.isAvailable && " · Off"}
                    </span>
                  </button>
                  <div className="flex">
                    <Button variant="ghost" size="icon-lg" aria-label={`Move ${i.name} up`} disabled={ii === 0} onClick={() => move(list, ii, -1, "/api/admin/items/reorder")}>
                      <ArrowUp />
                    </Button>
                    <Button variant="ghost" size="icon-lg" aria-label={`Move ${i.name} down`} disabled={ii === list.length - 1} onClick={() => move(list, ii, 1, "/api/admin/items/reorder")}>
                      <ArrowDown />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <Drawer open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DrawerContent className="mx-auto max-h-[94dvh] max-w-lg">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-display text-2xl font-extrabold">{draft?.id ? "Edit item" : "New item"}</DrawerTitle>
            <DrawerDescription>Changes appear live on every open menu.</DrawerDescription>
          </DrawerHeader>
          {draft && (
            <div className="grid gap-4 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
              <div className="grid gap-1.5">
                <Label htmlFor="it-name">Name</Label>
                <Input id="it-name" className="h-11 rounded-xl" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="it-desc">Description</Label>
                <Textarea id="it-desc" className="rounded-xl" maxLength={200} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="it-price">Price (₹)</Label>
                  <Input id="it-price" inputMode="decimal" className="h-11 rounded-xl" value={draft.rupees} onChange={(e) => setDraft({ ...draft, rupees: e.target.value.replace(/[^\d.]/g, "") })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="it-prep">Prep minutes</Label>
                  <Input id="it-prep" inputMode="numeric" className="h-11 rounded-xl" value={draft.prepMinutes} onChange={(e) => setDraft({ ...draft, prepMinutes: e.target.value.replace(/\D/g, "") })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="it-cat">Category</Label>
                  <select id="it-cat" className={selectCls} value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="it-stock">Stock (blank = unlimited)</Label>
                  <Input id="it-stock" inputMode="numeric" className="h-11 rounded-xl" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value.replace(/\D/g, "") })} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="it-model">3D model</Label>
                <div className="flex items-center gap-3">
                  <DishImage name={draft.name || "?"} src={stillFor(draft.modelKey)} className="size-14 shrink-0 rounded-xl" />
                  <select id="it-model" className={selectCls} value={draft.modelKey} onChange={(e) => setDraft({ ...draft, modelKey: e.target.value })}>
                    <option value="">No model (initial tile)</option>
                    {DISH_MODELS.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Switch checked={draft.isVeg} onCheckedChange={(v) => setDraft({ ...draft, isVeg: v })} /> Vegetarian
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Switch checked={draft.isAvailable} onCheckedChange={(v) => setDraft({ ...draft, isAvailable: v })} /> Available
                </label>
              </div>
              <Button size="xl" onClick={saveDraft} disabled={saving}>
                {saving ? "Saving…" : draft.id ? "Save changes" : "Add to menu"}
              </Button>
              {draft.id && (
                <Button
                  variant="ghost"
                  className="h-11 font-semibold text-chili hover:bg-chili-soft hover:text-chili"
                  onClick={() => {
                    const id = draft.id!;
                    setDraft(null);
                    void run(() => api(`/api/admin/items/${id}`, { method: "DELETE" }), "Archived. Hidden from the menu, kept in order history.");
                  }}
                >
                  <Archive /> Archive item
                </Button>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
