import { NextResponse } from "next/server";
import { apiError, handler, readJson } from "@/lib/api";
import { requireRole, requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getBoard, listMyOrders, placeOrder } from "@/lib/orders/service";

export const dynamic = "force-dynamic";

/** Place an order. Requires the Idempotency-Key header and a verified OTP token in the body. */
export const POST = handler(async (req) => {
  const user = await requireRole("STUDENT");
  const key = req.headers.get("idempotency-key");
  if (!rateLimit(`orders:${user.id}`, 5, 60_000)) apiError("RATE_LIMITED", "Too many orders in a minute. Please wait.");
  const { order, created } = await placeOrder(user, await readJson(req), key);
  return NextResponse.json({ order }, { status: created ? 201 : 200 });
});

/** scope=mine (STUDENT): own orders. scope=board (STAFF, ADMIN): today's kitchen board. */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  if (scope === "board") {
    await requireRole("STAFF", "ADMIN");
    return NextResponse.json(await getBoard());
  }
  if (scope === "mine") {
    const user = await requireRole("STUDENT");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
    return NextResponse.json(await listMyOrders(user.id, page));
  }
  await requireUser();
  apiError("VALIDATION_ERROR", "scope must be mine or board");
});
