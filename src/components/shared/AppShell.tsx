"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  ChefHat,
  ClipboardList,
  LogOut,
  Receipt,
  Settings,
  Soup,
  UtensilsCrossed,
  Users,
  Boxes,
} from "lucide-react";
import { ConnectionBadge } from "./ConnectionBadge";
import { Wordmark } from "./Brand";
import { ReconnectBanner } from "./ReconnectBanner";
import { useSocketContext } from "@/providers/SocketProvider";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/realtime/events";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean };

const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/menu", label: "Menu", icon: UtensilsCrossed },
    { href: "/orders", label: "My orders", icon: ClipboardList },
  ],
  STAFF: [
    { href: "/kitchen", label: "Board", icon: ChefHat, exact: true },
    { href: "/kitchen/stock", label: "Stock", icon: Boxes },
  ],
  ADMIN: [
    { href: "/admin", label: "Live", icon: BarChart3, exact: true },
    { href: "/kitchen", label: "Kitchen", icon: ChefHat, exact: true },
    { href: "/admin/menu", label: "Menu", icon: Soup },
    { href: "/admin/bills", label: "Bills", icon: Receipt },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
};

export function AppShell({
  role,
  firstName,
  children,
  wide = false,
}: {
  role: Role;
  firstName: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { socket } = useSocketContext();
  const nav = NAV[role];
  const isActive = (i: NavItem) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`));

  async function logout() {
    socket?.disconnect();
    await fetch("/api/auth/logout", { method: "POST" });
    qc.clear();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className={cn("mx-auto flex h-14 items-center gap-3 px-4", wide ? "max-w-6xl" : "max-w-3xl")}>
          <Link href={nav[0].href} className="shrink-0" aria-label="Home">
            <Wordmark className="text-base" />
          </Link>
          <nav className="ml-4 hidden gap-1 md:flex" aria-label="Main">
            {nav.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={isActive(i) ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
                  isActive(i) && "bg-foreground text-background hover:text-background",
                )}
              >
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ConnectionBadge />
            <span className="hidden text-sm text-muted-foreground sm:inline">Hi, {firstName}</span>
            <button
              onClick={logout}
              className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <ReconnectBanner />

      <main className={cn("mx-auto px-4 py-4", wide ? "max-w-6xl" : "max-w-3xl")}>{children}</main>

      {/* Bottom tab bar on phones */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="flex">
          {nav.map((i) => {
            const active = isActive(i);
            const Icon = i.icon;
            return (
              <li key={i.href} className="flex-1">
                <Link
                  href={i.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-muted-foreground",
                    active && "text-leaf",
                  )}
                >
                  <Icon className={cn("size-5", active && "stroke-[2.4]")} />
                  {i.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
