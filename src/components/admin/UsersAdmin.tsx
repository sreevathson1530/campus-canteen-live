"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";
import { Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/shared/Field";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { api, ClientApiError } from "@/lib/client-api";

type U = { id: string; name: string; email: string; role: string; phone: string | null; rollNumber: string | null; createdAt: string };

export function UsersAdmin({ selfId }: { selfId: string }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", dq],
    queryFn: () => api<{ users: U[]; total: number }>(`/api/admin/users?q=${encodeURIComponent(dq)}`),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });

  async function changeRole(u: U, role: string) {
    try {
      await api(`/api/admin/users/${u.id}`, { method: "PATCH", body: { role } });
      toast.success(`${u.name} is now ${role.toLowerCase()}`);
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Couldn't change role");
    }
  }

  async function createStaff() {
    try {
      await api("/api/admin/users", { body: { ...form, phone: form.phone || undefined } });
      toast.success("Staff account created");
      setOpen(false);
      setForm({ name: "", email: "", password: "", phone: "" });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Couldn't create account");
    }
  }

  return (
    <div className="grid gap-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold">Users</h1>
        <Button size="xl" onClick={() => setOpen(true)}>
          <UserPlus /> Staff
        </Button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, roll number or phone" className="h-12 rounded-2xl pl-9" aria-label="Search users" />
      </div>
      {isLoading ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : (
        <ul className="grid gap-2">
          {data?.users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email}
                  {u.phone && ` · ${u.phone}`}
                  {u.rollNumber && ` · ${u.rollNumber}`}
                </p>
              </div>
              <select
                aria-label={`Role of ${u.name}`}
                value={u.role}
                disabled={u.id === selfId}
                onChange={(e) => changeRole(u, e.target.value)}
                className="h-10 rounded-xl border bg-card px-2 text-sm font-semibold disabled:opacity-60"
                title={u.id === selfId ? "You can't remove your own admin role" : undefined}
              >
                <option value="STUDENT">Student</option>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </li>
          ))}
          {data && data.users.length === 0 && <li className="p-8 text-center text-muted-foreground">No users match.</li>}
        </ul>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-lg">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-display text-2xl font-extrabold">New staff account</DrawerTitle>
            <DrawerDescription>They sign in to the kitchen board with these details.</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-3 px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
            <Field label="Name" name="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Field label="Email" name="s-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Field label="Mobile (optional)" name="s-phone" type="tel" prefix="+91" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Field label="Password" name="s-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} hint="At least 8 characters." />
            <Button size="xl" onClick={createStaff}>
              Create staff account
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
