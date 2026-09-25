// Local (long-running server.ts) WebSocket endpoint at /api/ws. On Vercel the same path is served by
// src/app/api/ws/route.ts. Both authenticate from the session cookie and hand the socket to the hub.
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { parseCookie } from "cookie";
import { WebSocketServer } from "ws";
import { SESSION_COOKIE, verifySessionToken } from "../session";
import { addConnection } from "./hub";

export const WS_PATH = "/api/ws";

/**
 * Serves /api/ws upgrades. Next's dev server lazily attaches its own "upgrade" listener to the HTTP
 * server and would also grab (and destroy) our sockets, so /api/ws upgrades are intercepted in
 * `emit` before any listener runs. Every other upgrade (Next dev HMR) reaches Next unchanged.
 */
export function attachWebSocket(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

  async function handle(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const cookies = parseCookie(req.headers.cookie ?? "");
    const user = await verifySessionToken(cookies[SESSION_COOKIE]);
    if (!user) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => addConnection(ws, { id: user.id, role: user.role, firstName: user.firstName }));
  }

  const originalEmit = httpServer.emit.bind(httpServer);
  httpServer.emit = ((event: string, ...args: unknown[]) => {
    if (event === "upgrade") {
      const [req, socket, head] = args as [IncomingMessage, Duplex, Buffer];
      if ((req.url ?? "").split("?")[0] === WS_PATH) {
        void handle(req, socket, head);
        return true;
      }
    }
    return originalEmit(event, ...args);
  }) as typeof httpServer.emit;

  // Node only emits "upgrade" when a listener exists. This one also closes upgrades nobody else wants.
  const fallback = (_req: IncomingMessage, socket: Duplex) => {
    if (httpServer.listenerCount("upgrade") === 1) socket.destroy();
  };
  httpServer.on("upgrade", fallback);

  return wss;
}
