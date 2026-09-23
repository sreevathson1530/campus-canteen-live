import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createItem, listItemsAdmin } from "@/lib/menu/service";
import { itemSchema } from "@/lib/validators";

export const GET = handler(async () => {
  await requireRole("ADMIN");
  return NextResponse.json({ items: await listItemsAdmin() });
});

export const POST = handler(async (req) => {
  await requireRole("ADMIN");
  const input = itemSchema.parse(await readJson(req));
  return NextResponse.json({ item: await createItem(input) }, { status: 201 });
});
