/**
 * Demo traffic generator. Uses only the public HTTP API, never the database.
 *
 *   npm run simulate -- --url http://localhost:3000 --interval 5 --count 20 --kitchen
 *
 * Places a random order of 1-3 items every `interval` seconds (±40% jitter) as the seeded students,
 * verifying each order with the dev OTP code (OTP_DEV_CODE, default 1234). A phone can get one code
 * every 30 s and five per hour, so when a student hits a limit the simulator registers an extra
 * demo student and carries on. With --kitchen it also plays the kitchen: PREPARING after 5-15 s,
 * READY 10-20 s later, and COLLECTED 20 s after that (which creates the bill).
 */
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const opt = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def;
};
const BASE = opt("url", "http://localhost:3000").replace(/\/$/, "");
const INTERVAL = Number(opt("interval", "5"));
const COUNT = Number(opt("count", "20"));
const KITCHEN = args.includes("--kitchen");
const CODE = opt("code", process.env.OTP_DEV_CODE || "1234");

const log = (...m: unknown[]) => console.log(new Date().toLocaleTimeString(), ...m);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Session {
  name: string;
  cookie: string;
  blockedUntil: number;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(s: Session | null, path: string, body?: unknown, method?: string, extraHeaders: Record<string, string> = {}): Promise<{ data: T; setCookie: string | null }> {
  const res = await fetch(`${BASE}${path}`, {
    method: method ?? (body !== undefined ? "POST" : "GET"),
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(s ? { Cookie: s.cookie } : {}),
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(res.status, data.error?.code ?? "HTTP", data.error?.message ?? res.statusText);
  return { data: data as T, setCookie: res.headers.get("set-cookie") };
}

const cookieFrom = (setCookie: string | null) => (setCookie ?? "").split(";")[0];

async function login(email: string, password: string): Promise<Session> {
  const { setCookie, data } = await call<{ user: { name: string } }>(null, "/api/auth/login", { email, password });
  return { name: data.user.name, cookie: cookieFrom(setCookie), blockedUntil: 0 };
}

let extra = 0;
async function registerDemoStudent(): Promise<Session> {
  extra++;
  const phone = `7${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  const name = `Demo Student ${extra}`;
  const { setCookie } = await call(null, "/api/auth/register", {
    name,
    email: `demo-${Date.now().toString(36)}-${extra}@canteen.test`,
    phone,
    password: "student123",
  });
  log(`+ registered ${name} (+91 ${phone})`);
  return { name, cookie: cookieFrom(setCookie), blockedUntil: 0 };
}

interface MenuItem {
  id: string;
  name: string;
  isAvailable: boolean;
  stock: number | null;
}
interface Order {
  id: string;
  tokenNumber: number;
  totalPaise: number;
  version: number;
}

async function placeRandomOrder(s: Session): Promise<Order> {
  const { data: menu } = await call<{ items: MenuItem[] }>(s, "/api/menu");
  const orderable = menu.items.filter((i) => i.isAvailable && (i.stock === null || i.stock > 0));
  const picks = [...orderable].sort(() => Math.random() - 0.5).slice(0, Math.ceil(rand(0, 3)));
  if (!picks.length) throw new ApiError(409, "NOTHING_AVAILABLE", "Nothing on the menu is available");
  await call(s, "/api/otp/send", undefined, "POST");
  const { data: v } = await call<{ otpToken: string }>(s, "/api/otp/verify", { code: CODE });
  const { data } = await call<{ order: Order }>(
    s,
    "/api/orders",
    { lines: picks.map((p) => ({ menuItemId: p.id, quantity: Math.random() < 0.8 ? 1 : 2 })), otpToken: v.otpToken },
    "POST",
    { "Idempotency-Key": randomUUID() },
  );
  log(`→ ${s.name} placed token ${data.order.tokenNumber}: ${picks.map((p) => p.name).join(", ")}`);
  return data.order;
}

function runKitchen(staff: Session, order: Order) {
  void (async () => {
    try {
      await sleep(rand(5, 15) * 1000);
      await call(staff, `/api/orders/${order.id}/status`, { to: "PREPARING", expectedVersion: order.version }, "PATCH");
      log(`  kitchen: token ${order.tokenNumber} → PREPARING`);
      await sleep(rand(10, 20) * 1000);
      await call(staff, `/api/orders/${order.id}/status`, { to: "READY", expectedVersion: order.version + 1 }, "PATCH");
      log(`  kitchen: token ${order.tokenNumber} → READY`);
      await sleep(20_000);
      await call(staff, "/api/orders/collect", { tokenNumber: order.tokenNumber });
      log(`  kitchen: token ${order.tokenNumber} → COLLECTED (bill created)`);
    } catch (e) {
      log(`  kitchen: token ${order.tokenNumber} skipped: ${e instanceof ApiError ? `${e.code} ${e.message}` : e}`);
    }
  })();
}

async function main() {
  log(`Simulating ${COUNT} orders every ~${INTERVAL}s against ${BASE}${KITCHEN ? " with kitchen" : ""}`);
  const students: Session[] = [];
  for (const email of ["asha@canteen.test", "ravi@canteen.test", "meena@canteen.test"]) {
    students.push(await login(email, "student123"));
  }
  const staff = KITCHEN ? await login("kitchen@canteen.test", "kitchen123") : null;

  let placed = 0;
  let turn = 0;
  while (placed < COUNT) {
    const ready = students.filter((s) => s.blockedUntil <= Date.now());
    const s = ready.length ? ready[turn++ % ready.length] : await registerDemoStudent().then((n) => (students.push(n), n));
    try {
      const order = await placeRandomOrder(s);
      placed++;
      s.blockedUntil = Date.now() + 31_000; // one code per phone every 30 s
      if (staff) runKitchen(staff, order);
    } catch (e) {
      if (e instanceof ApiError) {
        log(`! ${s.name}: ${e.status} ${e.code} ${e.message}`);
        // Hourly OTP limit or too many active orders: park this student for a while.
        s.blockedUntil = Date.now() + (e.code === "TOO_MANY_ACTIVE_ORDERS" ? 60_000 : e.code === "RATE_LIMITED" ? 35_000 : 5_000);
        if (e.code === "CANTEEN_CLOSED") await sleep(10_000);
        continue;
      }
      throw e;
    }
    await sleep(INTERVAL * 1000 * rand(0.6, 1.4));
  }
  log(`Done: ${placed} orders placed.${KITCHEN ? " Waiting for the kitchen to finish…" : ""}`);
  if (KITCHEN) await sleep(60_000);
}

main().catch((e) => {
  console.error(e instanceof ApiError ? `${e.status} ${e.code}: ${e.message}` : e);
  process.exit(1);
});
