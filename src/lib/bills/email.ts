import { waitUntil } from "@vercel/functions";
import { prisma } from "../db";
import { apiError } from "../api";
import { getEmailSender } from "../email";
import { escapeHtml } from "../email/html";
import { formatDateTime } from "../time";

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

interface BillForEmail {
  billNumber: string;
  tokenNumber: number;
  studentName: string;
  totalPaise: number;
  orderedAt: Date;
  collectedAt: Date;
  lines: { name: string; quantity: number; unitPricePaise: number; lineTotalPaise: number }[];
}

export function billEmail(b: BillForEmail, canteenName: string) {
  const subject = `Your ${canteenName} bill ${b.billNumber} · ${rupees(b.totalPaise)}`;
  const text = [
    `${canteenName} · Bill ${b.billNumber}`,
    `Token ${b.tokenNumber} · ${b.studentName}`,
    `Ordered ${formatDateTime(b.orderedAt)} · Collected ${formatDateTime(b.collectedAt)}`,
    "",
    ...b.lines.map((l) => `${l.quantity} × ${l.name} @ ${rupees(l.unitPricePaise)} = ${rupees(l.lineTotalPaise)}`),
    "",
    `Total: ${rupees(b.totalPaise)}`,
    "Thank you! Enjoy your meal.",
  ].join("\n");
  const rows = b.lines
    .map(
      (l) => `<tr>
<td style="padding:8px 0;border-bottom:1px solid #eee4d3">${escapeHtml(l.name)}<br><span style="color:#6b6558;font-size:12px">${l.quantity} × ${rupees(l.unitPricePaise)}</span></td>
<td style="padding:8px 0;border-bottom:1px solid #eee4d3;text-align:right;font-weight:bold">${rupees(l.lineTotalPaise)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#faf6ee;font-family:Arial,Helvetica,sans-serif;color:#1b1a17">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border:1px solid #e1d8c6;border-radius:20px;overflow:hidden">
<tr><td style="background:#1f5e3b;color:#faf6ee;padding:20px 24px">
<div style="font-size:18px;font-weight:bold">${escapeHtml(canteenName)}</div>
<div style="font-size:13px;opacity:.85;margin-top:4px">Bill ${escapeHtml(b.billNumber)} · Token ${b.tokenNumber}</div></td></tr>
<tr><td style="padding:20px 24px">
<p style="margin:0 0 4px;font-size:15px">Hi ${escapeHtml(b.studentName.split(/\s+/)[0] || "there")}, thanks for your order!</p>
<p style="margin:0 0 16px;font-size:12px;color:#6b6558">Ordered ${formatDateTime(b.orderedAt)} · Collected ${formatDateTime(b.collectedAt)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}
<tr><td style="padding:12px 0 0;font-weight:bold;font-size:16px">Total</td>
<td style="padding:12px 0 0;text-align:right;font-weight:bold;font-size:20px">${rupees(b.totalPaise)}</td></tr></table>
</td></tr>
<tr><td style="padding:14px 24px;background:#fbebc6;font-size:12px;color:#5e4105">Keep this email as your receipt. Enjoy your meal!</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

/**
 * Emails the bill to the student's account email and records when. Skips a bill that was already
 * emailed unless force is set (the admin "Resend" button). Throws if sending fails.
 */
export async function sendBillEmail(orderId: string, { force = false } = {}): Promise<{ to: string; emailedAt: string }> {
  const bill = await prisma.bill.findUnique({
    where: { orderId },
    include: { lines: true, order: { select: { user: { select: { email: true } } } } },
  });
  if (!bill) apiError("NOT_FOUND", "This order has no bill yet (bills are created on collection)");
  const to = bill.order.user.email;
  if (bill.emailedAt && !force) return { to, emailedAt: bill.emailedAt.toISOString() };
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  await getEmailSender().send({ to, ...billEmail(bill, settings?.canteenName ?? "QuickCanteen") });
  const emailedAt = new Date();
  await prisma.bill.update({ where: { orderId }, data: { emailedAt } });
  return { to, emailedAt: emailedAt.toISOString() };
}

/** Called after an order is collected. Runs after the response (waitUntil) and never throws. */
export function queueBillEmail(orderId: string): void {
  if (process.env.NODE_ENV === "test") return;
  waitUntil(
    sendBillEmail(orderId).catch((err) => console.error("[bill] email failed", orderId, err instanceof Error ? err.message : err)),
  );
}
