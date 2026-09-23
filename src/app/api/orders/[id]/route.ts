import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOrderView } from "@/lib/orders/service";

export const dynamic = "force-dynamic";

export const GET = handler<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json(await getOrderView(user, id));
});
