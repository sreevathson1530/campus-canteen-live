"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MessageSquareText, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/shared/Field";
import { api, ClientApiError } from "@/lib/client-api";
import type { SettingsDTO } from "@/lib/settings";
import { cn } from "@/lib/utils";

function SettingsForm({ initial }: { initial: SettingsDTO }) {
  const [s, setS] = useState({
    canteenName: initial.canteenName,
    minutesPerOrder: String(initial.minutesPerOrder),
    maxActiveOrders: String(initial.maxActiveOrders),
    isOpen: initial.isOpen,
    closedMessage: initial.closedMessage ?? "",
    openingHours: initial.openingHours,
    location: initial.location,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: {
          canteenName: s.canteenName.trim(),
          minutesPerOrder: Number(s.minutesPerOrder),
          maxActiveOrders: Number(s.maxActiveOrders),
          isOpen: s.isOpen,
          closedMessage: s.closedMessage.trim() || null,
          openingHours: s.openingHours.trim(),
          location: s.location.trim(),
        },
      });
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-4 rounded-3xl border bg-card p-5">
      <Field label="Canteen name" name="canteenName" value={s.canteenName} onChange={(e) => setS({ ...s, canteenName: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Minutes per order"
          name="minutesPerOrder"
          inputMode="numeric"
          value={s.minutesPerOrder}
          onChange={(e) => setS({ ...s, minutesPerOrder: e.target.value.replace(/\D/g, "") })}
          hint="Used for wait estimates"
        />
        <Field
          label="Max active orders"
          name="maxActiveOrders"
          inputMode="numeric"
          value={s.maxActiveOrders}
          onChange={(e) => setS({ ...s, maxActiveOrders: e.target.value.replace(/\D/g, "") })}
          hint="Per student"
        />
      </div>
      <Field
        label="Opening hours"
        name="openingHours"
        value={s.openingHours}
        onChange={(e) => setS({ ...s, openingHours: e.target.value })}
        hint="Shown on the home page"
      />
      <Field label="Location" name="location" value={s.location} onChange={(e) => setS({ ...s, location: e.target.value })} />
      <label className="flex items-center justify-between rounded-2xl bg-secondary p-3 font-semibold">
        {s.isOpen ? "Canteen open" : "Canteen closed"}
        <Switch checked={s.isOpen} onCheckedChange={(v) => setS({ ...s, isOpen: v })} />
      </label>
      <Field label="Closed message" name="closedMessage" value={s.closedMessage} onChange={(e) => setS({ ...s, closedMessage: e.target.value })} placeholder="Back at 2 PM" />
      <Button size="xl" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </section>
  );
}

function SmsStatus() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["sms-status"],
    queryFn: () => api<{ provider: string; online: boolean; sentToday: number }>("/api/admin/sms-status"),
  });
  const DAILY_FREE = 100;
  return (
    <section className="grid gap-3 rounded-3xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <MessageSquareText className="size-5 text-leaf" />
        <h2 className="mr-auto font-display text-lg font-extrabold">OTP SMS</h2>
        <Button variant="outline" className="h-9 rounded-full" onClick={() => refetch()} disabled={isFetching}>
          Check
        </Button>
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-16 rounded-2xl" />
      ) : (
        <>
          <div className={cn("flex items-center gap-2 rounded-2xl p-3 font-semibold", data.online ? "bg-leaf-soft text-leaf" : "bg-chili-soft text-chili")}>
            {data.online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
            {data.provider === "console" ? "Development mode: codes print in the server terminal" : data.online ? "Gateway phone online" : "Gateway phone offline"}
          </div>
          <p className="text-sm text-muted-foreground">
            Codes sent today: <b className="text-foreground tabular">{data.sentToday}</b>
            {data.provider === "android-gateway" && ` of about ${DAILY_FREE} free SMS on a typical prepaid plan`}
          </p>
        </>
      )}
    </section>
  );
}

export function SettingsAdmin() {
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: () => api<{ settings: SettingsDTO }>("/api/settings") });
  return (
    <div className="grid gap-5 pb-6">
      <h1 className="font-display text-3xl font-extrabold">Settings</h1>
      {isLoading || !data ? <Skeleton className="h-96 rounded-3xl" /> : <SettingsForm initial={data.settings} />}
      <SmsStatus />
    </div>
  );
}
