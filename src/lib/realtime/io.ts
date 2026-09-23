import type { Server } from "socket.io";
import type { ClientToServerEvents, Presence, ServerToClientEvents, SocketData } from "./events";

export type IOServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

// Next.js loads route handlers in separate module instances, so shared server state lives on globalThis.
const g = globalThis as unknown as { __io?: IOServer; __presence?: Presence };

export function setIO(io: IOServer): void {
  g.__io = io;
}

export function getIO(): IOServer | null {
  return g.__io ?? null;
}

export function getPresence(): Presence {
  return (g.__presence ??= { kitchen: 0, students: 0 });
}
