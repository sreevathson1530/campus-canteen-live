import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { transitionStatus } from "@/lib/orders/service";

/** Body: { to, expectedVersion, reason? }. Who may do what is checked against the transition table. */
export const PATCH = handler<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const order = await transitionStatus(user, id, await readJson(req));
  return NextResponse.json({ order });
});
