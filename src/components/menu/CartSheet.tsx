import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, ClientApiError } from "@/lib/client-api";
import { formatRupees } from "@/lib/money";
import type { MenuItemDTO, OrderDTO } from "@/lib/realtime/events";
import { useCart } from "@/stores/cart";
import { MENU_KEY } from "@/hooks/useLiveMenu";
import { DishImage } from "./DishImage";
import { isSoldOut } from "./DishCard";
import { OtpStep } from "./OtpStep";
import { QtyStepper } from "./QtyStepper";

export interface CartRow {
  menuItemId: string;
  quantity: number;
  item: MenuItemDTO | undefined;
  unavailable: boolean;
  priceChanged: boolean;
}

export function useCartRows(items: MenuItemDTO[] | undefined) {
  const lines = useCart((s) => s.lines);
  const byId = new Map((items ?? []).map((i) => [i.id, i]));
  const rows: CartRow[] = lines.map((l) => {
    const item = byId.get(l.menuItemId);
    return {
      menuItemId: l.menuItemId,
      quantity: l.quantity,
      item,
      unavailable: !item || isSoldOut(item) || (item.stock !== null && item.stock < l.quantity),
      priceChanged: !!item && item.pricePaise !== l.seenPricePaise,
    };
  });
  const totalPaise = rows.reduce((s, r) => s + (r.item && !r.unavailable ? r.item.pricePaise * r.quantity : 0), 0);
  const count = rows.reduce((s, r) => s + r.quantity, 0);
  return { rows, totalPaise, count, blocked: rows.some((r) => r.unavailable) };
}

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function CartSheet({
  open,
  onOpenChange,
  items,
  isOpen,
  closedMessage,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: MenuItemDTO[] | undefined;
  isOpen: boolean;
  closedMessage: string | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { rows, totalPaise, blocked } = useCartRows(items);
  const note = useCart((s) => s.note);
  const setNote = useCart((s) => s.setNote);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const acknowledgePrice = useCart((s) => s.acknowledgePrice);
  const clear = useCart((s) => s.clear);
  const [step, setStep] = useState<"cart" | "otp">("cart");
  const [placing, setPlacing] = useState(false);
  // Generated once each time the sheet opens, so a double tap or a network retry creates one order.
  const [idemKey, setIdemKey] = useState(newKey);

  function handleOpenChange(o: boolean) {
    if (o) {
      setIdemKey(newKey());
      setStep("cart");
    }
    onOpenChange(o);
  }

  async function placeOrder(otpToken: string) {
    setPlacing(true);
    try {
      const { order } = await api<{ order: OrderDTO }>("/api/orders", {
        body: { lines: rows.map((r) => ({ menuItemId: r.menuItemId, quantity: r.quantity })), note: note || null, otpToken },
        headers: { "Idempotency-Key": idemKey },
      });
      clear();
      onOpenChange(false);
      toast.success(`Order placed · token ${order.tokenNumber}`);
      router.push(`/orders/${order.id}`);
    } catch (e) {
      const err = e instanceof ClientApiError ? e : null;
      if (err?.code === "OUT_OF_STOCK" || err?.code === "ITEM_UNAVAILABLE") {
        toast.error(err.message);
        void qc.invalidateQueries({ queryKey: MENU_KEY });
        setStep("cart");
      } else if (err?.code === "CANTEEN_CLOSED" || err?.code === "TOO_MANY_ACTIVE_ORDERS") {
        toast.error(err.message);
        setStep("cart");
      } else {
        // OTP problems and anything else surface inside the code step.
        throw e;
      }
    } finally {
      setPlacing(false);
    }
  }

  const canCheckout = rows.length > 0 && !blocked && isOpen;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-lg rounded-t-[1.75rem]">
        {step === "cart" ? (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle className="font-display text-2xl font-extrabold">Your cart</DrawerTitle>
              <DrawerDescription>Pay by cash or UPI when you collect.</DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-3 overflow-y-auto px-5 pb-2">
              {rows.length === 0 && <p className="py-8 text-center text-muted-foreground">Your cart is empty.</p>}
              {rows.map((r) => (
                <div key={r.menuItemId} className="flex items-center gap-3 rounded-2xl border bg-card p-2.5">
                  <DishImage name={r.item?.name ?? "?"} src={r.item?.imageUrl ?? null} className="size-16 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{r.item?.name ?? "Removed item"}</p>
                    {r.unavailable ? (
                      <p className="flex items-center gap-1 text-xs font-semibold text-chili">
                        <AlertTriangle className="size-3.5" /> No longer available
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground tabular">
                        {formatRupees((r.item?.pricePaise ?? 0) * r.quantity)}
                        {r.priceChanged && r.item && (
                          <button
                            type="button"
                            onClick={() => acknowledgePrice(r.menuItemId, r.item!.pricePaise)}
                            className="ml-2 rounded-full bg-turmeric-soft px-2 py-0.5 text-[11px] font-bold text-[#7a5306] dark:text-turmeric"
                            title="Tap to dismiss"
                          >
                            Price updated
                          </button>
                        )}
                      </p>
                    )}
                  </div>
                  {r.unavailable ? (
                    <Button variant="destructive" size="sm" onClick={() => remove(r.menuItemId)} className="rounded-full">
                      <Trash2 /> Remove
                    </Button>
                  ) : (
                    <QtyStepper
                      size="sm"
                      value={r.quantity}
                      onChange={(q) => setQty(r.menuItemId, q)}
                      label={r.item?.name ?? "item"}
                      disabledPlus={r.item?.stock !== null && r.item?.stock !== undefined && r.quantity >= r.item.stock}
                    />
                  )}
                </div>
              ))}
              {rows.length > 0 && (
                <label className="grid gap-1.5 pt-1">
                  <span className="text-sm font-semibold">Note for the kitchen</span>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={140}
                    placeholder="Less spicy, no onion…"
                    className="min-h-16 rounded-xl bg-card"
                  />
                  <span className="text-right text-xs text-muted-foreground tabular">{note.length}/140</span>
                </label>
              )}
            </div>
            <div className="grid gap-2 border-t px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-muted-foreground">Total</span>
                <span className="font-display text-2xl font-extrabold tabular">{formatRupees(totalPaise)}</span>
              </div>
              {!isOpen && (
                <p className="rounded-xl bg-chili-soft px-3 py-2 text-sm font-medium text-chili">
                  Canteen closed{closedMessage ? `: ${closedMessage}` : ""}
                </p>
              )}
              {blocked && <p className="text-sm font-medium text-chili">Remove unavailable items to continue.</p>}
              <Button size="xl" disabled={!canCheckout} onClick={() => setStep("otp")}>
                Place order
              </Button>
            </div>
          </>
        ) : (
          <>
            <DrawerHeader className="sr-only">
              <DrawerTitle>Verify your phone</DrawerTitle>
              <DrawerDescription>Enter the 4-digit code sent to your phone.</DrawerDescription>
            </DrawerHeader>
            <div className="pt-4 pb-[env(safe-area-inset-bottom)]">
              <OtpStep totalPaise={totalPaise} onVerified={placeOrder} onBack={() => setStep("cart")} busy={placing} />
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
