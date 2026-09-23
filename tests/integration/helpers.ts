import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendOtp, verifyOtp } from "@/lib/otp/service";
import { resetRateLimits } from "@/lib/rate-limit";

let n = 0;
const uniq = () => `${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function resetDb(): Promise<void> {
  resetRateLimits();
  await prisma.billLine.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.otpChallenge.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.dailyCounter.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { isOpen: true, closedMessage: null, maxActiveOrders: 3, minutesPerOrder: 3 },
    create: { id: 1 },
  });
}

export async function makeStudent(name = "Asha Raman") {
  const id = uniq();
  const digits = String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  return prisma.user.create({
    data: { name, email: `s${id}@t.test`, passwordHash: "x", role: "STUDENT", phone: `+919${digits}` },
  });
}

export async function makeStaff(name = "Kitchen Staff") {
  return prisma.user.create({ data: { name, email: `k${uniq()}@t.test`, passwordHash: "x", role: "STAFF" } });
}

export async function makeItem(opts: { name?: string; pricePaise?: number; stock?: number | null; isAvailable?: boolean } = {}) {
  const cat = await prisma.category.upsert({ where: { name: "Snacks" }, update: {}, create: { name: "Snacks" } });
  return prisma.menuItem.create({
    data: {
      name: opts.name ?? `Item ${uniq()}`,
      pricePaise: opts.pricePaise ?? 1500,
      stock: opts.stock === undefined ? null : opts.stock,
      isAvailable: opts.isAvailable ?? true,
      categoryId: cat.id,
    },
  });
}

/** Sends and verifies a code (the dev code 1234 is accepted in tests), returning a fresh order token. */
export async function otpToken(userId: string): Promise<string> {
  // Each order needs its own code; skip the resend cooldown for tests by back-dating earlier challenges.
  await prisma.otpChallenge.updateMany({ where: { userId }, data: { createdAt: new Date(Date.now() - 60 * 60_000) } });
  resetRateLimits();
  await sendOtp(userId, "test");
  const { otpToken } = await verifyOtp(userId, "1234");
  return otpToken;
}

export const key = () => randomUUID();
