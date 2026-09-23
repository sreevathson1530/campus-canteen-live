import { AppShell } from "@/components/shared/AppShell";
import { guardLayout } from "@/lib/page-auth";
import { SocketProvider } from "@/providers/SocketProvider";

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const user = await guardLayout("/kitchen", "STAFF", "ADMIN");
  return (
    <SocketProvider>
      <AppShell role={user.role} firstName={user.firstName} wide>
        {children}
      </AppShell>
    </SocketProvider>
  );
}
