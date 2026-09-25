import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { HOME_BY_ROLE } from "@/lib/session";
import { getMenu } from "@/lib/menu/service";
import { getPulse } from "@/lib/pulse";
import { HomeScreen } from "@/components/home/HomeScreen";

export const dynamic = "force-dynamic";

/** Public landing page. Kitchen staff and admins go straight to their own screens. */
export default async function Home() {
  const user = await getSessionUser();
  if (user && user.role !== "STUDENT") redirect(HOME_BY_ROLE[user.role]);
  const [menu, pulse] = await Promise.all([getMenu(), getPulse()]);
  return <HomeScreen menu={menu} initialPulse={pulse} firstName={user?.firstName ?? null} />;
}
