import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { sendOtp, verifyOtp } from "@/lib/otp/service";
import { placeOrder, transitionStatus } from "@/lib/orders/service";
import { getBillForViewer } from "@/lib/bills/service";
import { key, makeItem, makeStaff, makeStudent, otpToken, resetDb } from "./helpers";

const codeOf = (p: Promise<unknown>) =>
  p.then(
    () => "OK",
    (e) => (e instanceof ApiError ? e.code : `THROWN:${String(e)}`),
  );

beforeEach(resetDb);

describe("OTP", () => {
  it("masks the phone and blocks a resend within 30 s", async () => {
    const s = await makeStudent();
    const r = await sendOtp(s.id, "ip1");
    expect(r.maskedPhone).toBe(`••••• •${s.phone!.slice(-4)}`);
    expect(await codeOf(sendOtp(s.id, "ip1"))).toBe("RATE_LIMITED");
  });

  it("5 wrong codes lock the challenge", async () => {
    const s = await makeStudent();
    await sendOtp(s.id, "ip");
    for (let i = 0; i < 4; i++) expect(await codeOf(verifyOtp(s.id, "0000"))).toBe("OTP_INVALID");
    expect(await codeOf(verifyOtp(s.id, "0000"))).toBe("OTP_LOCKED");
    expect(await codeOf(verifyOtp(s.id, "1234"))).toBe("OTP_LOCKED");
  });

  it("an expired code is refused", async () => {
    const s = await makeStudent();
    await sendOtp(s.id, "ip");
    await prisma.otpChallenge.updateMany({ where: { userId: s.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await codeOf(verifyOtp(s.id, "1234"))).toBe("OTP_INVALID");
  });

  it("stores only hashes and returns a token", async () => {
    const s = await makeStudent();
    await sendOtp(s.id, "ip");
    const { otpToken } = await verifyOtp(s.id, "1234");
    const row = await prisma.otpChallenge.findFirstOrThrow({ where: { userId: s.id } });
    expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.tokenHash).not.toContain(otpToken);
  });

  it("an expired token can't place an order", async () => {
    const s = await makeStudent();
    const item = await makeItem();
    const tok = await otpToken(s.id);
    await prisma.otpChallenge.updateMany({ where: { userId: s.id }, data: { tokenExpiresAt: new Date(Date.now() - 1000) } });
    expect(await codeOf(placeOrder(s, { lines: [{ menuItemId: item.id, quantity: 1 }], otpToken: tok }, key()))).toBe("OTP_REQUIRED");
  });
});

describe("bill", () => {
  async function collected() {
    const s = await makeStudent("Asha Raman");
    const staff = await makeStaff("Kitchen Staff");
    const dosa = await makeItem({ name: "Masala Dosa", pricePaise: 5000 });
    const coffee = await makeItem({ name: "Filter Coffee", pricePaise: 1500 });
    const { order } = await placeOrder(
      s,
      { lines: [{ menuItemId: dosa.id, quantity: 1 }, { menuItemId: coffee.id, quantity: 2 }], otpToken: await otpToken(s.id) },
      key(),
    );
    const k = { id: staff.id, role: "STAFF" as const, name: staff.name };
    await transitionStatus(k, order.id, { to: "PREPARING", expectedVersion: 1 });
    await transitionStatus(k, order.id, { to: "READY", expectedVersion: 2 });
    return { s, staff, dosa, order, k };
  }

  it("no bill before collection; exactly one bill with copied lines after", async () => {
    const { s, order, k } = await collected();
    const viewer = { id: s.id, role: "STUDENT" as const };
    expect(await codeOf(getBillForViewer(order.id, viewer))).toBe("NOT_FOUND");
    const done = await transitionStatus(k, order.id, { to: "COLLECTED", expectedVersion: 3 });
    const bill = await getBillForViewer(order.id, viewer);
    expect(done.billNumber).toBe(bill.billNumber);
    expect(bill.studentName).toBe("Asha Raman");
    expect(bill.studentPhone).toBe(s.phone);
    expect(bill.totalPaise).toBe(8000);
    expect(bill.collectedByName).toBe("Kitchen Staff");
    expect(bill.lines).toEqual([
      { name: "Masala Dosa", quantity: 1, unitPricePaise: 5000, lineTotalPaise: 5000 },
      { name: "Filter Coffee", quantity: 2, unitPricePaise: 1500, lineTotalPaise: 3000 },
    ]);
    expect(await prisma.bill.count()).toBe(1);
  });

  it("later price, name and phone changes leave the bill unchanged", async () => {
    const { s, dosa, order, k } = await collected();
    await transitionStatus(k, order.id, { to: "COLLECTED", expectedVersion: 3 });
    await prisma.menuItem.update({ where: { id: dosa.id }, data: { pricePaise: 9900, name: "Ghee Dosa" } });
    await prisma.user.update({ where: { id: s.id }, data: { name: "Asha R", phone: "+919999999999" } });
    const bill = await getBillForViewer(order.id, { id: s.id, role: "STUDENT" });
    expect(bill.lines[0]).toMatchObject({ name: "Masala Dosa", unitPricePaise: 5000 });
    expect(bill.studentName).toBe("Asha Raman");
    expect(bill.studentPhone).toBe(s.phone);
  });

  it("staff see a masked phone; other students are refused", async () => {
    const { order, staff, k } = await collected();
    await transitionStatus(k, order.id, { to: "COLLECTED", expectedVersion: 3 });
    const forStaff = await getBillForViewer(order.id, { id: staff.id, role: "STAFF" });
    expect(forStaff.studentPhone).toMatch(/^••••• •\d{4}$/);
    const other = await makeStudent("Meena Iyer");
    expect(await codeOf(getBillForViewer(order.id, { id: other.id, role: "STUDENT" }))).toBe("FORBIDDEN");
  });

  it("cancelled orders never get a bill", async () => {
    const s = await makeStudent();
    const item = await makeItem();
    const { order } = await placeOrder(s, { lines: [{ menuItemId: item.id, quantity: 1 }], otpToken: await otpToken(s.id) }, key());
    await transitionStatus({ id: s.id, role: "STUDENT", name: s.name }, order.id, { to: "CANCELLED", expectedVersion: 1 });
    expect(await prisma.bill.count()).toBe(0);
  });
});
