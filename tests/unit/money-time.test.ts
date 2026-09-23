import { describe, expect, it } from "vitest";
import { formatRupees } from "@/lib/money";
import { businessDate, canteenHour } from "@/lib/time";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";
import { safeNext } from "@/lib/session";

describe("formatRupees", () => {
  it("uses Indian digit grouping", () => {
    expect(formatRupees(12345600)).toBe("₹1,23,456");
    expect(formatRupees(5000)).toBe("₹50");
    expect(formatRupees(0)).toBe("₹0");
  });
  it("shows paise only when non-zero", () => {
    expect(formatRupees(1250)).toBe("₹12.5");
  });
});

describe("businessDate across midnight in Asia/Kolkata", () => {
  it("is still the same day just before IST midnight", () => {
    expect(businessDate(new Date("2026-09-23T18:29:59Z"))).toBe("2026-09-23");
  });
  it("rolls over at IST midnight (18:30 UTC)", () => {
    expect(businessDate(new Date("2026-09-23T18:30:00Z"))).toBe("2026-09-24");
  });
  it("hour of day is in the canteen timezone", () => {
    expect(canteenHour(new Date("2026-09-23T06:45:00Z"))).toBe(12);
  });
});

describe("rateLimit", () => {
  it("allows up to the limit per window, then blocks, then frees up", () => {
    resetRateLimits();
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) expect(rateLimit("k", 5, 60_000, t + i)).toBe(true);
    expect(rateLimit("k", 5, 60_000, t + 10)).toBe(false);
    expect(rateLimit("k", 5, 60_000, t + 60_001)).toBe(true);
  });
});

describe("safeNext", () => {
  it("only accepts relative paths", () => {
    expect(safeNext("/orders/1")).toBe("/orders/1");
    expect(safeNext("https://evil.test")).toBeNull();
    expect(safeNext("//evil.test")).toBeNull();
    expect(safeNext("/\\evil.test")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});
