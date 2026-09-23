import { parseCookie } from "cookie";
import { SESSION_COOKIE, verifySessionToken } from "../session";
import type { IOServer } from "./io";
import { getIO, getPresence } from "./io";
import type { Presence } from "./events";

/**
 * Auth middleware, automatic room joins and presence.
 * Clients never choose rooms: the server derives them from the session cookie.
 */
export function registerSocketServer(io: IOServer): void {
  io.use(async (socket, next) => {
    const cookies = parseCookie(socket.handshake.headers.cookie ?? "");
    const user = await verifySessionToken(cookies[SESSION_COOKIE]);
    if (!user) return next(new Error("UNAUTHORIZED"));
    socket.data.user = { id: user.id, role: user.role, firstName: user.firstName };
    next();
  });

  io.on("connection", (socket) => {
    const { id, role } = socket.data.user;
    socket.join("public");
    if (role === "STUDENT") socket.join(`user:${id}`);
    if (role === "STAFF" || role === "ADMIN") socket.join("kitchen");
    if (role === "ADMIN") socket.join("admin");

    recountPresence(io);
    socket.on("disconnect", () => recountPresence(io));
  });
}

function recountPresence(io: IOServer): void {
  const presence = getPresence();
  let kitchen = 0;
  let students = 0;
  for (const s of io.of("/").sockets.values()) {
    const role = s.data.user?.role;
    if (role === "STUDENT") students++;
    else if (role === "STAFF" || role === "ADMIN") kitchen++;
  }
  presence.kitchen = kitchen;
  presence.students = students;
  const payload: Presence = { kitchen, students };
  getIO()?.to(["admin", "kitchen"]).emit("presence:update", payload);
}
