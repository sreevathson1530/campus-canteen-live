import type { Metadata } from "next";
import { KitchenBoard } from "@/components/kitchen/KitchenBoard";

export const metadata: Metadata = { title: "Kitchen" };

export default function KitchenPage() {
  return <KitchenBoard />;
}
