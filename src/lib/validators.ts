import { z } from "zod";

export const ROLES = ["STUDENT", "STAFF", "ADMIN"] as const;
export const ORDER_STATUSES = ["PLACED", "PREPARING", "READY", "COLLECTED", "CANCELLED", "REJECTED"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

/** Indian mobile: 10 digits starting 6-9, with optional +91 / spaces. Normalised to "+91XXXXXXXXXX". */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^\+?91(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"))
  .transform((v) => `+91${v}`);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  rollNumber: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined)),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  phone: phoneSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});

export const placeOrderSchema = z.object({
  lines: z
    .array(z.object({ menuItemId: z.string().min(1), quantity: z.number().int().min(1).max(10) }))
    .min(1, "Your cart is empty")
    .max(10, "An order can hold up to 10 different items")
    .refine((ls) => new Set(ls.map((l) => l.menuItemId)).size === ls.length, "Duplicate items in cart"),
  note: optionalText(140),
  otpToken: z.string().min(1, "Verify your phone first"),
});
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const transitionSchema = z.object({
  to: z.enum(ORDER_STATUSES),
  expectedVersion: z.number().int().min(1),
  reason: z.string().trim().max(140).optional(),
});
export type TransitionInput = z.infer<typeof transitionSchema>;

export function rejectReasonOk(reason: string | undefined): boolean {
  const r = reason?.trim() ?? "";
  return r.length >= 3 && r.length <= 140;
}

export const collectSchema = z.object({ tokenNumber: z.number().int().min(1) });

export const stockSchema = z
  .object({
    isAvailable: z.boolean().optional(),
    stock: z.number().int().min(0).max(9999).nullable().optional(),
  })
  .refine((v) => v.isAvailable !== undefined || v.stock !== undefined, "Nothing to update");

export const settingsSchema = z.object({
  canteenName: z.string().trim().min(2).max(60).optional(),
  isOpen: z.boolean().optional(),
  closedMessage: optionalText(140),
  minutesPerOrder: z.number().int().min(1).max(60).optional(),
  maxActiveOrders: z.number().int().min(1).max(20).optional(),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const otpVerifySchema = z.object({ code: z.string().regex(/^\d{4}$/, "Enter the 4-digit code") });

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(40),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const itemSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: optionalText(200),
  pricePaise: z.number().int().min(100).max(1_000_000),
  isVeg: z.boolean(),
  categoryId: z.string().min(1),
  imageUrl: optionalText(500),
  modelKey: optionalText(40),
  prepMinutes: z.number().int().min(1).max(120).default(5),
  stock: z.number().int().min(0).max(9999).nullable().default(null),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
});
export const itemPatchSchema = itemSchema.partial();

export const reorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(200),
  phone: phoneSchema.optional(),
});

export const roleChangeSchema = z.object({ role: z.enum(ROLES) });
