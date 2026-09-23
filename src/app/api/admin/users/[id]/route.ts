import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { changeRole } from "@/lib/users/service";
import { roleChangeSchema } from "@/lib/validators";

export const PATCH = handler<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireRole("ADMIN");
  const { id } = await params;
  const { role } = roleChangeSchema.parse(await readJson(req));
  return NextResponse.json({ user: await changeRole(admin.id, id, role) });
});
