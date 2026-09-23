import { formatInTimeZone } from "date-fns-tz";

export function canteenTz(): string {
  return process.env.CANTEEN_TIMEZONE || process.env.NEXT_PUBLIC_CANTEEN_TIMEZONE || "Asia/Kolkata";
}

/** Calendar date in the canteen's timezone, "YYYY-MM-DD". Tokens restart on each business date. */
export function businessDate(d: Date = new Date(), tz: string = canteenTz()): string {
  return formatInTimeZone(d, tz, "yyyy-MM-dd");
}

/** Hour of day (0-23) in the canteen's timezone. */
export function canteenHour(d: Date, tz: string = canteenTz()): number {
  return Number(formatInTimeZone(d, tz, "H"));
}

export function formatClock(iso: string | Date, tz: string = canteenTz()): string {
  return formatInTimeZone(typeof iso === "string" ? new Date(iso) : iso, tz, "h:mm a");
}

export function formatDateTime(iso: string | Date, tz: string = canteenTz()): string {
  return formatInTimeZone(typeof iso === "string" ? new Date(iso) : iso, tz, "d MMM yyyy, h:mm a");
}
