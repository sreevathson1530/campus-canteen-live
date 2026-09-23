import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../db";
import { ApiError } from "../api";
import type { registerSchema } from "../validators";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  rollNumber: string | null;
};

export function toPublicUser(u: PublicUser & Record<string, unknown>): PublicUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, rollNumber: u.rollNumber };
}

/** Maps unique-constraint violations to friendly API errors; anything else is returned unchanged. */
export function uniqueToApiError(e: unknown): unknown {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const target = String(e.meta?.target ?? "");
    if (target.includes("phone")) return new ApiError("PHONE_TAKEN", "That mobile number already belongs to another account");
    if (target.includes("email")) return new ApiError("EMAIL_TAKEN", "An account with that email already exists");
    if (target.includes("rollNumber")) return new ApiError("VALIDATION_ERROR", "That roll number is already registered");
  }
  return e;
}

/** Registering always creates a STUDENT, whatever the client sends. */
export async function registerStudent(input: z.infer<typeof registerSchema>): Promise<PublicUser> {
  const passwordHash = await bcrypt.hash(input.password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        rollNumber: input.rollNumber ?? null,
        phone: input.phone,
        passwordHash,
        role: "STUDENT",
      },
    });
    return toPublicUser(user);
  } catch (e) {
    throw uniqueToApiError(e);
  }
}

// Compared against when the email is unknown, so both paths take the same time.
let dummyHash: string | null = null;

/** Returns the user or null. Never reveals whether the email exists. */
export async function verifyLogin(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  dummyHash ??= await bcrypt.hash("not-a-real-password", 10);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  return user && ok ? user : null;
}
