import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as ioc, type Socket } from "socket.io-client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setIO, type IOServer } from "@/lib/realtime/io";
import { registerSocketServer } from "@/lib/realtime/socket-server";
import { SESSION_COOKIE, signSessionToken } from "@/lib/session";
import { placeOrder, transitionStatus } from "@/lib/orders/service";
import { updateStock } from "@/lib/menu/service";
import { key, makeItem, makeStaff, makeStudent, otpToken, resetDb } from "./helpers";

type Received = { event: string; payload: unknown }[];

let http: HttpServer;
let io: IOServer;
let url: string;
const clients: Socket[] = [];

async function connect(user?: { id: string; role: string; name: string }): Promise<{ socket: Socket; got: Received; error?: string }> {
  const headers: Record<string, string> = {};
  if (user) headers.cookie = `${SESSION_COOKIE}=${await signSessionToken(user)}`;
  const socket = ioc(url, { path: "/socket.io", transports: ["websocket"], extraHeaders: headers, reconnection: false });
  clients.push(socket);
  const got: Received = [];
  socket.onAny((event, payload) => got.push({ event, payload }));
  return new Promise((resolve) => {
    socket.on("connect", () => resolve({ socket, got }));
    socket.on("connect_error", (e) => resolve({ socket, got, error: e.message }));
  });
}

const settle = () => new Promise((r) => setTimeout(r, 1300)); // stats are throttled to 1/s

beforeAll(async () => {
  http = createServer();
  io = new Server(http, { path: "/socket.io" }) as IOServer;
  setIO(io);
  registerSocketServer(io);
  await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

afterAll(async () => {
  clients.forEach((c) => c.disconnect());
  await new Promise((r) => io.close(() => r(undefined)));
});

beforeEach(resetDb);

describe("Socket.IO rooms and privacy", () => {
  it("rejects a connection without a valid session", async () => {
    const anon = await connect();
    expect(anon.error).toBe("UNAUTHORIZED");
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

    const events = (r: Received) => new Set(r.map((e) => e.event));

    // Kitchen: new and updated orders, presence; never admin stats.
    expect(events(k.got)).toContain("order:created");
    expect(events(k.got)).toContain("order:updated");
    expect(events(k.got)).not.toContain("stats:update");

    // Admin: stats and presence too.
    expect(events(a.got)).toContain("stats:update");
    expect(events(a.got)).toContain("presence:update");

    // The owner gets updates about their own order and their queue position, but no kitchen feed.
    expect(events(s1.got)).toContain("order:updated");
    expect(events(s1.got)).toContain("queue:update");
    expect(events(s1.got)).not.toContain("order:created");
    expect(events(s1.got)).not.toContain("stats:update");
    expect(events(s1.got)).not.toContain("presence:update");

    // Another student sees nothing about Asha's order, only public menu changes.
    expect(events(s2.got)).not.toContain("order:updated");
    expect(events(s2.got)).not.toContain("order:created");
    expect(events(s2.got)).not.toContain("queue:update");
    expect(events(s2.got)).toContain("menu:item-updated");

    // Kitchen payloads carry a first name only (no email, phone or roll number).
    const created = k.got.find((e) => e.event === "order:created")!.payload as Record<string, unknown>;
    expect(created.studentFirstName).toBe("Asha");
    expect(JSON.stringify(created)).not.toMatch(/@|\+91|Raman/);
  });
});
