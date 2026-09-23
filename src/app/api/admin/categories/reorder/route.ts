import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { reorderCategories } from "@/lib/menu/service";
import { reorderSchema } from "@/lib/validators";

export const POST = handler(async (req) => {
  await requireRole("ADMIN");
  const { ids } = reorderSchema.parse(await readJson(req));
  await reorderCategories(ids);
  return NextResponse.json({ ok: true });
});
