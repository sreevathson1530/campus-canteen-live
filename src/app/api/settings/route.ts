import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getSettings, toSettingsDTO, updateSettings } from "@/lib/settings";
import { settingsSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const GET = handler(async () => NextResponse.json({ settings: toSettingsDTO(await getSettings()) }));

/** STAFF: isOpen and closedMessage only. ADMIN: all fields. */
export const PATCH = handler(async (req) => {
  const user = await requireRole("STAFF", "ADMIN");
  const input = settingsSchema.parse(await readJson(req));
  return NextResponse.json({ settings: await updateSettings(input, user.role as "STAFF" | "ADMIN") });
});
