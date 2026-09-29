import { NextResponse } from "next/server";
import { ApiError, apiError, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { sendBillEmail } from "@/lib/bills/email";

export const dynamic = "force-dynamic";

/** Admin "Resend bill": emails the bill again to the student's account email. */
export const POST = handler<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  await requireRole("ADMIN");
  const { id } = await params;
  const result = await sendBillEmail(id, { force: true }).catch((err) => {
    if (err instanceof ApiError) throw err; // e.g. NOT_FOUND
    console.error("[bill] resend failed", id, err);
    apiError("SMS_SEND_FAILED", "Couldn't send the email. Check Admin → Settings → Order codes.");
  });
  return NextResponse.json(result);
});
