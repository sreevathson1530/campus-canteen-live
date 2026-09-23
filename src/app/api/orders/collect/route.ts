import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { collectByToken } from "@/lib/orders/service";
import { collectSchema } from "@/lib/validators";

/** Body: { tokenNumber }. Moves today's READY order to COLLECTED and creates its bill. */
export const POST = handler(async (req) => {
  const user = await requireRole("STAFF", "ADMIN");
  const { tokenNumber } = collectSchema.parse(await readJson(req));
  return NextResponse.json({ order: await collectByToken(user, tokenNumber) });
});
