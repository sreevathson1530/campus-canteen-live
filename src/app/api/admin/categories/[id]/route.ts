import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { deleteCategory, updateCategory } from "@/lib/menu/service";
import { categorySchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler<Ctx>(async (req, { params }) => {
  await requireRole("ADMIN");
  const { id } = await params;
  const input = categorySchema.partial().parse(await readJson(req));
  return NextResponse.json({ category: await updateCategory(id, input) });
});

export const DELETE = handler<Ctx>(async (_req, { params }) => {
  await requireRole("ADMIN");
  const { id } = await params;
  await deleteCategory(id);
  return NextResponse.json({ ok: true });
});
