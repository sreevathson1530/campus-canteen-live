"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/Field";
import { api, ClientApiError } from "@/lib/client-api";
import { safeNext } from "@/lib/session";

// Demo shortcuts are for local development only; production never shows passwords on the page.
const SHOW_DEMO = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === "1";

const DEMO = [
  ["Student", "asha@canteen.test", "student123"],
  ["Kitchen", "kitchen@canteen.test", "kitchen123"],
  ["Admin", "admin@canteen.test", "admin123"],
] as const;

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { home } = await api<{ home: string }>("/api/auth/login", { body: { email, password } });
      router.replace(safeNext(params.get("next")) ?? home);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not sign in. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className="font-display text-3xl font-extrabold">Welcome back</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to order or run the kitchen.</p>

      <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="rounded-xl bg-chili-soft px-3 py-2 text-sm font-medium text-chili">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 rounded-xl text-base font-bold" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-semibold text-leaf underline-offset-4 hover:underline">
          Create a student account
        </Link>
      </p>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/credits" className="underline-offset-4 hover:underline">
          Photo credits
        </Link>
      </p>

      {SHOW_DEMO && (
        <details className="mt-4 rounded-xl border bg-card p-3 text-sm">
          <summary className="cursor-pointer font-semibold">Demo accounts</summary>
          <ul className="mt-2 grid gap-1.5">
            {DEMO.map(([role, e, p]) => (
              <li key={e}>
                <button
                  type="button"
                  className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => {
                    setEmail(e);
                    setPassword(p);
                  }}
                >
                  <span className="font-semibold">{role}</span>{" "}
                  <span className="text-muted-foreground">{e}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
