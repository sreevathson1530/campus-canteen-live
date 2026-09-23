import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { HOME_BY_ROLE } from "@/lib/session";

/** Sends each role to its home route, or to sign in. */
export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? HOME_BY_ROLE[user.role] : "/login");
}
