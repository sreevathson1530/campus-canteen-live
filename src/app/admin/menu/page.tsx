import type { Metadata } from "next";
import { MenuAdmin } from "@/components/admin/MenuAdmin";

export const metadata: Metadata = { title: "Menu" };

export default function Page() {
  return <MenuAdmin />;
}
