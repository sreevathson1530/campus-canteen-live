import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { UsersAdmin } from "@/components/admin/UsersAdmin";

export const metadata: Metadata = { title: "Users" };

export default async function Page() {
  const user = await getSessionUser();
  return <UsersAdmin selfId={user?.id ?? ""} />;
}
