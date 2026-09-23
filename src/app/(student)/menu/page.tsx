import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { MenuScreen } from "@/components/menu/MenuScreen";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const user = await getSessionUser();
  return <MenuScreen firstName={user?.firstName ?? "there"} />;
}
