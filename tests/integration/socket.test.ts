import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import WebSocket from "ws";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { attachWebSocket, WS_PATH } from "@/lib/realtime/ws-server";
import { SESSION_COOKIE, signSessionToken } from "@/lib/session";
import { placeOrder, transitionStatus } from "@/lib/orders/service";
import { updateStock } from "@/lib/menu/service";
import { key, makeItem, makeStaff, makeStudent, otpToken, resetDb } from "./helpers";

type Frame = { e: string; d?: unknown };

let http: HttpServer;
let url: string;
const clients: WebSocket[] = [];

async function connect(user?: { id: string; role: string; name: string }): Promise<{ got: Frame[]; error?: string }> {
  const headers: Record<string, string> = {};
  if (user) headers.cookie = `${SESSION_COOKIE}=${await signSessionToken(user)}`;
  const ws = new WebSocket(`${url}${WS_PATH}`, { headers });
  clients.push(ws);
  const got: Frame[] = [];
  return new Promise((resolve) => {
    ws.on("message", (raw) => {
      const f = JSON.parse(String(raw)) as Frame;
      if (f.e === "ready") resolve({ got });
      else if (f.e !== "ping") got.push(f);
    });
    ws.on("unexpected-response", (_req, res) => resolve({ got, error: String(res.statusCode) }));
    ws.on("error", (e) => resolve({ got, error: e.message }));
  });
}

const settle = () => new Promise((r) => setTimeout(r, 300));

beforeAll(async () => {
  http = createServer((_req, res) => res.end());
  attachWebSocket(http);
  await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
  url = `ws://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

afterAll(async () => {
  clients.forEach((c) => c.terminate());
  await new Promise((r) => http.close(() => r(undefined)));
});

beforeEach(resetDb);

describe("WebSocket rooms and privacy", () => {
  it("rejects a connection without a valid session (401)", async () => {
    const anon = await connect();
    expect(anon.error).toBe("401");
  });

  it("each socket receives only its own room's events", async () => {
    const asha = await makeStudent("Asha Raman");
    const ravi = await makeStudent("Ravi Kumar");
    const staff = await makeStaff("Kitchen Staff");
    const item = await makeItem({ name: "Samosa", stock: 5 });

    const s1 = await connect({ id: asha.id, role: "STUDENT", name: asha.name });
    const s2 = await connect({ id: ravi.id, role: "STUDENT", name: ravi.name });
    const k = await connect({ id: staff.id, role: "STAFF", name: staff.name });
    const a = await connect({ id: "admin-x", role: "ADMIN", name: "Admin Person" });
    expect([s1.error, s2.error, k.error, a.error]).toEqual([undefined, undefined, undefined, undefined]);

    const { order } = await placeOrder(asha, { lines: [{ menuItemId: item.id, quantity: 1 }], otpToken: await otpToken(asha.id) }, key());
    await transitionStatus({ id: staff.id, role: "STAFF", name: staff.name }, order.id, { to: "PREPARING", expectedVersion: 1 });
    await updateStock(item.id, { isAvailable: false });
    await settle();

    const events = (r: Frame[]) => new Set(r.map((e) => e.e));

    // Kitchen: new and updated orders and presence; never admin stats.
    expect(events(k.got)).toContain("order:created");
    expect(events(k.got)).toContain("order:updated");
    expect(events(k.got)).toContain("presence:update");
    expect(events(k.got)).not.toContain("stats:update");

    // Admin: presence too (stats are throttled and switched off in tests).
    expect(events(a.got)).toContain("presence:update");

    // The owner gets their own order updates and queue position, but no kitchen feed or presence.
    expect(events(s1.got)).toContain("order:updated");
    expect(events(s1.got)).toContain("queue:update");
    expect(events(s1.got)).not.toContain("order:created");
    expect(events(s1.got)).not.toContain("presence:update");

    // Another student sees nothing about Asha's order, only public menu changes.
    expect(events(s2.got)).not.toContain("order:updated");
    expect(events(s2.got)).not.toContain("order:created");
    expect(events(s2.got)).not.toContain("queue:update");
    expect(events(s2.got)).toContain("menu:item-updated");

    // Kitchen payloads carry a first name only (no email, phone or surname).
    const created = k.got.find((e) => e.e === "order:created")!.d as Record<string, unknown>;
    expect(created.studentFirstName).toBe("Asha");
    expect(JSON.stringify(created)).not.toMatch(/@|\+91|Raman/);
  });
});
