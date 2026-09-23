import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CANTEEN_CLOSED"
  | "ITEM_UNAVAILABLE"
  | "OUT_OF_STOCK"
  | "TOO_MANY_ACTIVE_ORDERS"
  | "VERSION_CONFLICT"
  | "INVALID_TRANSITION"
  | "RATE_LIMITED"
  | "OTP_REQUIRED"
  | "OTP_INVALID"
  | "OTP_LOCKED"
  | "PHONE_TAKEN"
  | "EMAIL_TAKEN"
  | "SMS_SEND_FAILED"
  | "INTERNAL_ERROR";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CANTEEN_CLOSED: 409,
  ITEM_UNAVAILABLE: 409,
  OUT_OF_STOCK: 409,
  TOO_MANY_ACTIVE_ORDERS: 409,
  VERSION_CONFLICT: 409,
  INVALID_TRANSITION: 422,
  RATE_LIMITED: 429,
  OTP_REQUIRED: 403,
  OTP_INVALID: 400,
  OTP_LOCKED: 429,
  PHONE_TAKEN: 409,
  EMAIL_TAKEN: 409,
  SMS_SEND_FAILED: 503,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details: unknown = {},
  ) {
    super(message);
  }
  get status(): number {
    return STATUS[this.code];
  }
}

export function apiError(code: ErrorCode, message: string, details: unknown = {}): never {
  throw new ApiError(code, message, details);
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details ?? {} } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: err.issues[0]?.message ?? "Invalid request",
          details: { issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
        },
      },
      { status: 400 },
    );
  }
  console.error("[api] unexpected error", err);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong", details: {} } },
    { status: 500 },
  );
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler: standard error shape, never leaks stack traces, JSON-only writes. */
export function handler<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        const len = req.headers.get("content-length");
        const hasBody = len !== null && Number(len) > 0;
        const type = req.headers.get("content-type") ?? "";
        if (hasBody && !type.toLowerCase().startsWith("application/json")) {
          apiError("VALIDATION_ERROR", "Content-Type must be application/json");
        }
      }
      return await fn(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    apiError("VALIDATION_ERROR", "Body must be valid JSON");
  }
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
