import { describe, expect, it } from "vitest";
import {
  otpVerifySchema,
  placeOrderSchema,
  registerSchema,
  rejectReasonOk,
  settingsSchema,
  stockSchema,
  transitionSchema,
} from "@/lib/validators";

const line = { menuItemId: "item1", quantity: 1 };

describe("registerSchema", () => {
  const base = { name: "Asha Raman", email: "asha@x.test", password: "password1", phone: "9840014821" };

  it("normalises an Indian mobile to +91", () => {
    expect(registerSchema.parse(base).phone).toBe("+919840014821");
    expect(registerSchema.parse({ ...base, phone: "+91 98400 14821" }).phone).toBe("+919840014821");
  });

  it("rejects numbers that are not 10-digit Indian mobiles", () => {
    for (const phone of ["12345", "5840014821", "98400148210", "abcdefghij"]) {
      expect(registerSchema.safeParse({ ...base, phone }).success).toBe(false);
    }
  });

  it("enforces name 2-50, password >= 8, valid email", () => {
    expect(registerSchema.safeParse({ ...base, name: "A" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, name: "A".repeat(51) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
  });

  it("treats an empty roll number as absent", () => {
    expect(registerSchema.parse({ ...base, rollNumber: "" }).rollNumber).toBeUndefined();
  });
});

describe("placeOrderSchema", () => {
  const base = { lines: [line], otpToken: "tok" };

  it("accepts 1-10 lines with quantity 1-10", () => {
    expect(placeOrderSchema.safeParse(base).success).toBe(true);
    expect(placeOrderSchema.safeParse({ ...base, lines: [] }).success).toBe(false);
    const eleven = Array.from({ length: 11 }, (_, i) => ({ menuItemId: `i${i}`, quantity: 1 }));
    expect(placeOrderSchema.safeParse({ ...base, lines: eleven }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...base, lines: [{ ...line, quantity: 11 }] }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...base, lines: [{ ...line, quantity: 0 }] }).success).toBe(false);
  });

  it("rejects duplicate items and notes over 140 characters", () => {
    expect(placeOrderSchema.safeParse({ ...base, lines: [line, line] }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...base, note: "x".repeat(141) }).success).toBe(false);
    expect(placeOrderSchema.parse({ ...base, note: "  " }).note).toBeNull();
  });

  it("requires an otpToken", () => {
    expect(placeOrderSchema.safeParse({ lines: [line] }).success).toBe(false);
  });

  it("ignores client-sent prices", () => {
    const parsed = placeOrderSchema.parse({ ...base, lines: [{ ...line, pricePaise: 1 }] });
    expect(parsed.lines[0]).toEqual(line);
  });
});

describe("other schemas", () => {
  it("otp code must be exactly 4 digits", () => {
    expect(otpVerifySchema.safeParse({ code: "1234" }).success).toBe(true);
    expect(otpVerifySchema.safeParse({ code: "12a4" }).success).toBe(false);
    expect(otpVerifySchema.safeParse({ code: "12345" }).success).toBe(false);
  });

  it("transition needs a known status and a positive version", () => {
    expect(transitionSchema.safeParse({ to: "READY", expectedVersion: 2 }).success).toBe(true);
    expect(transitionSchema.safeParse({ to: "DONE", expectedVersion: 2 }).success).toBe(false);
    expect(transitionSchema.safeParse({ to: "READY", expectedVersion: 0 }).success).toBe(false);
  });

  it("reject reason is 3-140 characters", () => {
    expect(rejectReasonOk("ok")).toBe(false);
    expect(rejectReasonOk("Item ran out")).toBe(true);
    expect(rejectReasonOk("x".repeat(141))).toBe(false);
  });

  it("stock accepts null (unlimited) and non-negative integers", () => {
    expect(stockSchema.safeParse({ stock: null }).success).toBe(true);
    expect(stockSchema.safeParse({ stock: -1 }).success).toBe(false);
    expect(stockSchema.safeParse({ isAvailable: false }).success).toBe(true);
  });

  it("settings bounds", () => {
    expect(settingsSchema.safeParse({ minutesPerOrder: 0 }).success).toBe(false);
    expect(settingsSchema.safeParse({ maxActiveOrders: 3, isOpen: false, closedMessage: "Back at 2 PM" }).success).toBe(
      true,
    );
  });
});
