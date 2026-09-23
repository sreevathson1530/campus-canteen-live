import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getBillForViewer } from "@/lib/bills/service";

export const dynamic = "force-dynamic";

export const GET = handler<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json({ bill: await getBillForViewer(id, user) });
});
