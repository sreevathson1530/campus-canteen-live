import { AppShell } from "@/components/shared/AppShell";
import { guardLayout } from "@/lib/page-auth";
import { SocketProvider } from "@/providers/SocketProvider";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await guardLayout("/menu", "STUDENT");
  return (
    <SocketProvider>
      <AppShell role={user.role} firstName={user.firstName}>
        {children}
      </AppShell>
    </SocketProvider>
  );
}
