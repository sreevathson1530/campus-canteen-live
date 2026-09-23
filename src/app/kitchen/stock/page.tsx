import type { Metadata } from "next";
import { StockManager } from "@/components/kitchen/StockManager";

export const metadata: Metadata = { title: "Stock & status" };

export default function StockPage() {
  return <StockManager />;
}
