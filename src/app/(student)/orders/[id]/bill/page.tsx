import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getBillForViewer } from "@/lib/bills/service";
import { BillView } from "@/components/orders/BillView";
import { PrintButton } from "@/components/orders/PrintButton";

export const metadata: Metadata = { title: "Bill" };

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("STUDENT").catch(() => notFound());
  const bill = await getBillForViewer(id, user).catch((e) => {
    if (e instanceof ApiError) notFound();
    throw e;
  });
  return (
    <div className="grid gap-4 pb-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/orders/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Order
        </Link>
        <PrintButton />
      </div>
      <BillView bill={bill} />
    </div>
  );
}
