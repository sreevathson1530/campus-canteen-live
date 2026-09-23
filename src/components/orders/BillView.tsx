import type { BillDTO } from "@/lib/bills/service";
import { formatRupees } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

/** The receipt itself. Values are the copies stored on the bill, never live menu data. */
export function BillView({ bill }: { bill: BillDTO }) {
  return (
    <article className="bill-print mx-auto w-full max-w-sm rounded-3xl border bg-card p-6 shadow-sm print:border-0 print:shadow-none">
      <div className="border-b border-dashed pb-4 text-center">
        <p className="font-display text-xl font-extrabold">{bill.canteenName}</p>
        <p className="text-sm text-muted-foreground">Bill no. {bill.billNumber}</p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-b border-dashed py-4 text-sm">
        <dt className="text-muted-foreground">Name</dt>
        <dd className="font-semibold">{bill.studentName}</dd>
        <dt className="text-muted-foreground">Mobile</dt>
        <dd className="font-semibold tabular">{bill.studentPhone.startsWith("+91") ? `+91 ${bill.studentPhone.slice(3, 8)} ${bill.studentPhone.slice(8)}` : bill.studentPhone}</dd>
        <dt className="text-muted-foreground">Token</dt>
        <dd className="font-semibold tabular">{bill.tokenNumber}</dd>
        <dt className="text-muted-foreground">Ordered</dt>
        <dd className="tabular">{formatDateTime(bill.orderedAt)}</dd>
        <dt className="text-muted-foreground">Collected</dt>
        <dd className="tabular">{formatDateTime(bill.collectedAt)}</dd>
      </dl>

      <table className="w-full border-b border-dashed text-sm">
        <thead>
          <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
            <th className="py-2 text-left font-bold">Dish</th>
            <th className="py-2 text-right font-bold">Qty</th>
            <th className="py-2 text-right font-bold">Rate</th>
            <th className="py-2 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {bill.lines.map((l, i) => (
            <tr key={i}>
              <td className="py-1.5 pr-2">{l.name}</td>
              <td className="py-1.5 text-right">{l.quantity}</td>
              <td className="py-1.5 text-right">{formatRupees(l.unitPricePaise)}</td>
              <td className="py-1.5 text-right font-semibold">{formatRupees(l.lineTotalPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-baseline justify-between pt-4">
        <span className="font-display text-lg font-extrabold">Total</span>
        <span className="font-display text-2xl font-extrabold tabular">{formatRupees(bill.totalPaise)}</span>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Handed over by {bill.collectedByName} · Thank you!
      </p>
    </article>
  );
}
