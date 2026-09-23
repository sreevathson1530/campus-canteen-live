import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createCategory, listCategoriesAdmin } from "@/lib/menu/service";
import { categorySchema } from "@/lib/validators";

export const GET = handler(async () => {
  await requireRole("ADMIN");
  return NextResponse.json({ categories: await listCategoriesAdmin() });
});

export const POST = handler(async (req) => {
  await requireRole("ADMIN");
  const input = categorySchema.parse(await readJson(req));
  return NextResponse.json({ category: await createCategory(input) }, { status: 201 });
});
