"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/Field";
import { api, ClientApiError } from "@/lib/client-api";

type Errors = Partial<Record<"name" | "email" | "phone" | "password" | "rollNumber" | "form", string>>;

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", rollNumber: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api("/api/auth/register", { body: form });
      router.replace("/menu");
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError) {
        if (err.code === "PHONE_TAKEN") setErrors({ phone: err.message });
        else if (err.code === "EMAIL_TAKEN") setErrors({ email: err.message });
        else if (err.code === "VALIDATION_ERROR") {
          const issues = (err.details.issues as { path: string; message: string }[] | undefined) ?? [];
          const next: Errors = {};
          for (const i of issues) next[(i.path as keyof Errors) || "form"] ??= i.message;
          if (!issues.length) next.form = err.message;
          setErrors(next);
        } else setErrors({ form: err.message });
      } else setErrors({ form: "Could not register. Check your connection." });
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className="font-display text-3xl font-extrabold">Create your account</h2>
      <p className="mt-1 text-sm text-muted-foreground">We verify your mobile with a 4-digit code before every order.</p>

      <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
        <Field label="Full name" name="name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} />
        <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
        <Field
          label="Mobile number"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          prefix="+91"
          maxLength={11}
          placeholder="98400 14821"
          value={form.phone}
          onChange={set("phone")}
          error={errors.phone}
          hint="One account per number. Codes for your orders go here."
        />
        <Field label="Roll number (optional)" name="rollNumber" autoComplete="off" value={form.rollNumber} onChange={set("rollNumber")} error={errors.rollNumber} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} hint="At least 8 characters." />
        {errors.form && (
          <p role="alert" className="rounded-xl bg-chili-soft px-3 py-2 text-sm font-medium text-chili">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 rounded-xl text-base font-bold" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-leaf underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
