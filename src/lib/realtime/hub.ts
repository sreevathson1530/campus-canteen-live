// Per-instance registry of live WebSocket connections: room membership, delivery from the bus, and presence.
// Clients never choose rooms; they are derived from the verified session, as before.
import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import { getRedis, publish, subscribe, type BusMessage } from "./bus";
import type { Presence, Role } from "./events";

export interface LiveUser {
  id: string;
  role: Role;
  firstName: string;
}

interface Conn {
  ws: WebSocket;
  user: LiveUser;
  rooms: Set<string>;
}

const INSTANCE = randomUUID();
const PRESENCE_TTL_S = 45;
const HEARTBEAT_MS = 20_000;

const g = globalThis as unknown as {
  __cclHub?: { conns: Set<Conn>; unsubscribe: (() => void) | null; heartbeat: ReturnType<typeof setInterval> | null };
};

function hub() {
  return (g.__cclHub ??= { conns: new Set(), unsubscribe: null, heartbeat: null });
}

export function roomsFor(user: LiveUser): string[] {
  const rooms = ["public"];
  if (user.role === "STUDENT") rooms.push(`user:${user.id}`);
  if (user.role === "STAFF" || user.role === "ADMIN") rooms.push("kitchen");
  if (user.role === "ADMIN") rooms.push("admin");
  return rooms;
}

function deliver(m: BusMessage) {
  const frame = JSON.stringify({ e: m.event, d: m.payload });
  for (const c of hub().conns) {
    if (c.ws.readyState !== 1) continue;
    if (m.rooms.some((r) => c.rooms.has(r))) c.ws.send(frame);
  }
}

function localCounts(): Presence {
  let kitchen = 0;
  let students = 0;
  for (const c of hub().conns) {
    if (c.user.role === "STUDENT") students++;
    else kitchen++;
  }
  return { kitchen, students };
}

/** Presence across every instance: each instance writes its own counts to Redis with a TTL. */
export async function getPresence(): Promise<Presence> {
  const redis = getRedis();
  if (!redis) return localCounts();
  const r = await redis;
  const keys = await r.keys("ccl:presence:*");
  if (!keys.length) return { kitchen: 0, students: 0 };
  const values = await r.mget(...keys);
  return values.reduce<Presence>(
    (acc, v) => {
      if (!v) return acc;
      const p = JSON.parse(v) as Presence;
      return { kitchen: acc.kitchen + p.kitchen, students: acc.students + p.students };
    },
    { kitchen: 0, students: 0 },
  );
}

async function presenceChanged() {
  const redis = getRedis();
  if (redis) {
    const r = await redis;
    const counts = localCounts();
    if (counts.kitchen + counts.students === 0) await r.del(`ccl:presence:${INSTANCE}`);
    else await r.set(`ccl:presence:${INSTANCE}`, JSON.stringify(counts), "EX", PRESENCE_TTL_S);
  }
  await publish({ rooms: ["admin", "kitchen"], event: "presence:update", payload: await getPresence() });
}

function ensureRunning() {
  const h = hub();
  h.unsubscribe ??= subscribe(deliver);
  h.heartbeat ??= setInterval(() => {
    // Keeps idle connections open through proxies, lets clients detect dead links, refreshes presence TTL.
    for (const c of h.conns) if (c.ws.readyState === 1) c.ws.send('{"e":"ping"}');
    if (h.conns.size) void presenceChanged().catch(() => undefined);
  }, HEARTBEAT_MS);
}

/** Registers an authenticated WebSocket; it receives events for its rooms until it closes. */
export function addConnection(ws: WebSocket, user: LiveUser): void {
  ensureRunning();
  const conn: Conn = { ws, user, rooms: new Set(roomsFor(user)) };
  hub().conns.add(conn);
  ws.send('{"e":"ready"}');
  void presenceChanged().catch((e) => console.error("[presence]", e));
  ws.on("message", () => undefined); // clients don't send events; ignore anything they do send
  ws.on("close", () => {
    hub().conns.delete(conn);
    void presenceChanged().catch((e) => console.error("[presence]", e));
  });
  ws.on("error", () => ws.terminate());
}

/** Closes every local connection (graceful shutdown). */
export function closeAll(): void {
  for (const c of hub().conns) c.ws.close(1001, "server shutting down");
}
