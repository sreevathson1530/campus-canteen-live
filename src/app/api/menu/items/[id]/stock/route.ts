import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { updateStock } from "@/lib/menu/service";
import { stockSchema } from "@/lib/validators";

export const PATCH = handler<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireRole("STAFF", "ADMIN");
  const { id } = await params;
  const input = stockSchema.parse(await readJson(req));
  return NextResponse.json({ item: await updateStock(id, input) });
});
