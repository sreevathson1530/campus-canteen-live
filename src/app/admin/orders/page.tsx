import type { Metadata } from "next";
import { OrdersAdmin } from "@/components/admin/OrdersAdmin";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <OrdersAdmin />;
}
