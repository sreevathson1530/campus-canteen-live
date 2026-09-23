import type { Metadata } from "next";
import { BillsAdmin } from "@/components/admin/BillsAdmin";

export const metadata: Metadata = { title: "Bills" };

export default function Page() {
  return <BillsAdmin />;
}
