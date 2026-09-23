import { AppShell } from "@/components/shared/AppShell";
import { guardLayout } from "@/lib/page-auth";
import { SocketProvider } from "@/providers/SocketProvider";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await guardLayout("/admin", "ADMIN");
  return (
    <SocketProvider>
      <AppShell role={user.role} firstName={user.firstName} wide>
        {children}
      </AppShell>
    </SocketProvider>
  );
}
