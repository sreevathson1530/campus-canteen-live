import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { archiveItem, updateItem } from "@/lib/menu/service";
import { itemPatchSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler<Ctx>(async (req, { params }) => {
  await requireRole("ADMIN");
  const { id } = await params;
  const input = itemPatchSchema.parse(await readJson(req));
  return NextResponse.json({ item: await updateItem(id, input) });
});

/** Archives the item: hidden from the menu, kept for order history. */
export const DELETE = handler<Ctx>(async (_req, { params }) => {
  await requireRole("ADMIN");
  const { id } = await params;
  await archiveItem(id);
  return NextResponse.json({ ok: true });
});
