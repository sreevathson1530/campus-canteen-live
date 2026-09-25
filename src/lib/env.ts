import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  PORT: z.coerce.number().int().default(3000),
  BIND_HOST: z.string().default("0.0.0.0"),
  CANTEEN_TIMEZONE: z.string().default("Asia/Kolkata"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  SMS_PROVIDER: z.enum(["console", "android-gateway", "android-gateway-cloud"]).default("console"),
  SMS_GATEWAY_URL: z.string().optional(),
  SMS_GATEWAY_USER: z.string().optional(),
  SMS_GATEWAY_PASSWORD: z.string().optional(),
  OTP_DEV_CODE: z
    .string()
    .regex(/^\d{4}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Parsed environment. Throws with a readable message when something required is missing. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }
  if (parsed.data.NODE_ENV === "production" && parsed.data.OTP_DEV_CODE) {
    throw new Error("OTP_DEV_CODE must not be set in production");
  }
  cached = parsed.data;
  return cached;
}
