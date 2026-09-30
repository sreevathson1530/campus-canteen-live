import Link from "next/link";
import { Wordmark } from "@/components/shared/Brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-background px-4 pt-[max(env(safe-area-inset-top),2.5rem)] pb-10">
      <Link href="/" aria-label="Home">
        <Wordmark className="text-base" />
      </Link>
      <div className="mt-8 w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{children}</div>
      <p className="mt-6 max-w-xs text-center text-sm text-muted-foreground">Order ahead, confirm with a code, and pick up with your token.</p>
    </main>
  );
}
