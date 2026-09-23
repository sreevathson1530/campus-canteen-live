import type { Settings } from "@prisma/client";
import { prisma } from "./db";
import type { CanteenStatus } from "./realtime/events";
import type { SettingsInput } from "./validators";
import { emitCanteenStatus, scheduleStatsUpdate } from "./realtime/emitters";

export async function getSettings(): Promise<Settings> {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export function toCanteenStatus(s: Settings): CanteenStatus {
  return { isOpen: s.isOpen, closedMessage: s.closedMessage, canteenName: s.canteenName };
}

export type SettingsDTO = CanteenStatus & { minutesPerOrder: number; maxActiveOrders: number };

export function toSettingsDTO(s: Settings): SettingsDTO {
  return { ...toCanteenStatus(s), minutesPerOrder: s.minutesPerOrder, maxActiveOrders: s.maxActiveOrders };
}

/** STAFF may change only isOpen and closedMessage; ADMIN may change everything. */
export async function updateSettings(input: SettingsInput, role: "STAFF" | "ADMIN"): Promise<SettingsDTO> {
  const data: SettingsInput =
    role === "ADMIN" ? input : { isOpen: input.isOpen, closedMessage: input.closedMessage };
  await getSettings();
  const s = await prisma.settings.update({
    where: { id: 1 },
    data: Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  });
  emitCanteenStatus(toCanteenStatus(s));
  scheduleStatsUpdate();
  return toSettingsDTO(s);
}
