import { createServer } from "node:http";
import nextEnv from "@next/env";
import next from "next";
import { Server } from "socket.io";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

async function main() {
  // Fail fast on a missing or weak JWT_SECRET, or OTP_DEV_CODE in production.
  const { env } = await import("./src/lib/env");
  const cfg = env();
  const { setIO } = await import("./src/lib/realtime/io");
  const { registerSocketServer } = await import("./src/lib/realtime/socket-server");
  const { prisma, ensurePragmas } = await import("./src/lib/db");

  await ensurePragmas();

  const dev = process.env.NODE_ENV !== "production";
  const hostname = cfg.BIND_HOST;
  const port = cfg.PORT;
  const httpServer = createServer();
  const app = next({ dev, hostname, port, httpServer });
  const handle = app.getRequestHandler();
  await app.prepare();

  httpServer.on("request", (req, res) => handle(req, res));

  const io = new Server<
    import("./src/lib/realtime/events").ClientToServerEvents,
    import("./src/lib/realtime/events").ServerToClientEvents,
    Record<string, never>,
    import("./src/lib/realtime/events").SocketData
  >(httpServer, {
    path: "/socket.io",
    // Leave other WebSocket upgrades (Next.js dev HMR) alone.
    destroyUpgrade: false,
  });
  setIO(io);
  registerSocketServer(io);

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
    io.close();
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
