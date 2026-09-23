import type { Metadata } from "next";
import { OrderTracker } from "@/components/orders/OrderTracker";

export const metadata: Metadata = { title: "Your order" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderTracker id={id} />;
}
