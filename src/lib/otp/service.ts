import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { prisma, type Tx } from "../db";
import { apiError } from "../api";
import { rateLimit } from "../rate-limit";
import { getSmsSender } from "../sms";

export const CODE_TTL_MS = 5 * 60_000;
export const TOKEN_TTL_MS = 10 * 60_000;
export const RESEND_COOLDOWN_MS = 30_000;
export const MAX_ATTEMPTS = 5;
export const MAX_SENDS_PER_HOUR_PER_PHONE = 5;
export const MAX_SENDS_PER_HOUR_PER_IP = 10;

/** Codes and tokens are stored only as keyed hashes. */
function digest(kind: "code" | "token", value: string): string {
  return createHmac("sha256", process.env.JWT_SECRET ?? "").update(`${kind}:${value}`).digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

export function maskPhone(phone: string): string {
  return `••••• •${phone.slice(-4)}`;
}

/** Dev/test only: OTP_DEV_CODE is accepted for any challenge. Never in production. */
function devCode(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  return process.env.OTP_DEV_CODE || null;
}

export interface SendResult {
  expiresAt: string;
  resendAt: string;
  maskedPhone: string;
}

export async function sendOtp(userId: string, ip: string): Promise<SendResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  if (!user?.phone) apiError("VALIDATION_ERROR", "Add a mobile number to your account first");
  const phone = user.phone;
  const now = Date.now();

  const last = await prisma.otpChallenge.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (last && now - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - (now - last.createdAt.getTime())) / 1000);
    apiError("RATE_LIMITED", `Wait ${retryAfter}s before asking for a new code`, { retryAfterSeconds: retryAfter });
  }
  const sentThisHour = await prisma.otpChallenge.count({ where: { phone, createdAt: { gt: new Date(now - 3_600_000) } } });
  if (sentThisHour >= MAX_SENDS_PER_HOUR_PER_PHONE) apiError("RATE_LIMITED", "Too many codes for this number. Try again later.");
  if (!rateLimit(`otp-ip:${ip}`, MAX_SENDS_PER_HOUR_PER_IP, 3_600_000)) apiError("RATE_LIMITED", "Too many codes requested. Try again later.");

  const code = String(randomInt(0, 10_000)).padStart(4, "0");
  const challenge = await prisma.otpChallenge.create({
    data: { userId, phone, codeHash: digest("code", code), expiresAt: new Date(now + CODE_TTL_MS) },
  });

  try {
    await getSmsSender().send(phone, `${code} is your Campus Canteen order code. Valid for 5 minutes. Do not share it.`);
  } catch (err) {
    console.error("[otp] SMS send failed", err);
    // Don't count a failed send against the cooldown or hourly limit.
    await prisma.otpChallenge.delete({ where: { id: challenge.id } });
    apiError("SMS_SEND_FAILED", "Couldn't send the code. Try again, or ask at the counter.");
  }

  return {
    expiresAt: challenge.expiresAt.toISOString(),
    resendAt: new Date(now + RESEND_COOLDOWN_MS).toISOString(),
    maskedPhone: maskPhone(phone),
  };
}

export async function verifyOtp(userId: string, code: string): Promise<{ otpToken: string; expiresAt: string }> {
  const challenge = await prisma.otpChallenge.findFirst({
    where: { userId, verifiedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) apiError("OTP_INVALID", "Request a code first", { attemptsLeft: 0 });
  if (challenge.attempts >= MAX_ATTEMPTS) apiError("OTP_LOCKED", "Too many wrong tries. Request a new code.");
  if (challenge.expiresAt.getTime() < Date.now()) apiError("OTP_INVALID", "That code has expired. Request a new one.", { attemptsLeft: 0, expired: true });

  const dev = devCode();
  const ok = sameHash(challenge.codeHash, digest("code", code)) || (dev !== null && code === dev);
  if (!ok) {
    const updated = await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    const attemptsLeft = MAX_ATTEMPTS - updated.attempts;
    if (attemptsLeft <= 0) apiError("OTP_LOCKED", "Too many wrong tries. Request a new code.");
    apiError("OTP_INVALID", `Wrong code. ${attemptsLeft} ${attemptsLeft === 1 ? "try" : "tries"} left.`, { attemptsLeft });
  }

  const otpToken = randomBytes(24).toString("base64url");
  const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { verifiedAt: new Date(), tokenHash: digest("token", otpToken), tokenExpiresAt },
  });
  return { otpToken, expiresAt: tokenExpiresAt.toISOString() };
}

/**
 * Uses up a verified token inside the order transaction. Conditional update, like stock:
 * only an unused, unexpired token of this user matches, so a token can back exactly one order.
 * If the transaction rolls back, the token stays unused.
 */
export async function consumeOtpToken(tx: Tx, userId: string, otpToken: string): Promise<string> {
  const tokenHash = digest("token", otpToken);
  const res = await tx.otpChallenge.updateMany({
    where: { tokenHash, userId, usedAt: null, tokenExpiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (res.count === 0) apiError("OTP_REQUIRED", "Verify your phone with a new code to place this order");
  return tokenHash;
}

export async function smsStatus() {
  const sender = getSmsSender();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [online, sentToday] = await Promise.all([
    sender.health(),
    prisma.otpChallenge.count({ where: { createdAt: { gte: startOfDay } } }),
  ]);
  return { provider: sender.name, online, sentToday };
}
