import type { Metadata } from "next";
import { MyOrders } from "@/components/orders/MyOrders";

export const metadata: Metadata = { title: "My orders" };

export default function MyOrdersPage() {
  return <MyOrders />;
}
