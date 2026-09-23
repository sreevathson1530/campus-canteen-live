import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createStaff, searchUsers } from "@/lib/users/service";
import { createStaffSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const GET = handler(async (req) => {
  await requireRole("ADMIN");
  const p = new URL(req.url).searchParams;
  return NextResponse.json(await searchUsers(p.get("q") ?? undefined, Number(p.get("page") ?? 1) || 1));
});

/** Creates a STAFF account. */
export const POST = handler(async (req) => {
  await requireRole("ADMIN");
  const input = createStaffSchema.parse(await readJson(req));
  return NextResponse.json({ user: await createStaff(input) }, { status: 201 });
});
