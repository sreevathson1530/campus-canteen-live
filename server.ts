import { createServer } from "node:http";
import { existsSync } from "node:fs";
import next from "next";

// Load .env with Node's own loader, not @next/env: @next/env snapshots process.env on first use and
// restores that snapshot when Next reloads env (e.g. after a new route appears in dev). Calling it here,
// before Next sets its internal dev flag, would make that reload drop the flag and break every route.
if (existsSync(".env")) process.loadEnvFile(".env");

async function main() {
  // Fail fast on a missing or weak JWT_SECRET, or OTP_DEV_CODE in production.
  const { env } = await import("./src/lib/env");
  const cfg = env();
  const { attachWebSocket } = await import("./src/lib/realtime/ws-server");
  const { closeAll } = await import("./src/lib/realtime/hub");
  const { prisma, ensurePragmas } = await import("./src/lib/db");

  await ensurePragmas();

  const dev = process.env.NODE_ENV !== "production";
  const hostname = cfg.BIND_HOST;
  const port = cfg.PORT;
  const httpServer = createServer();
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const trustProxy = process.env.TRUST_PROXY === "1";
  httpServer.on("request", (req, res) => {
    // Rate limits key on the client IP. Unless we sit behind a trusted proxy (TRUST_PROXY=1 on
    // Render/Railway), a client-sent X-Forwarded-For is replaced with the real socket address.
    if (!trustProxy) req.headers["x-forwarded-for"] = req.socket.remoteAddress ?? "unknown";
    void handle(req, res);
  });

  // Live events: WebSockets at /api/ws; every other upgrade (Next dev HMR) is left to Next.
  const wss = attachWebSocket(httpServer);

  httpServer.listen(port, hostname, () => {
    console.log(`> Campus Canteen Live ready on http://localhost:${port} (${dev ? "dev" : "production"})`);
    if (hostname === "0.0.0.0") console.log(`> Phones on the same Wi-Fi: ${cfg.NEXT_PUBLIC_APP_URL}`);
    console.log(`> SMS provider: ${cfg.SMS_PROVIDER}${cfg.OTP_DEV_CODE ? ` (dev code ${cfg.OTP_DEV_CODE} accepted)` : ""}`);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n> ${signal} received, shutting down`);
    closeAll();
    wss.close();
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
