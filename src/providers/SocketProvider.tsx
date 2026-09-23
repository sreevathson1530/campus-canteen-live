"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/realtime/events";

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type ConnectionStatus = "live" | "reconnecting" | "offline";

interface ConnState {
  status: ConnectionStatus;
  /** When the socket last went down (null while live). */
  disconnectedSince: number | null;
}

interface SocketCtx extends ConnState {
  socket: ClientSocket | null;
}

const Ctx = createContext<SocketCtx>({ socket: null, status: "reconnecting", disconnectedSince: null });

const OFFLINE_AFTER_MS = 10_000;

function createSocket(): ClientSocket | null {
  if (typeof window === "undefined") return null;
  return io({ path: "/socket.io", withCredentials: true, autoConnect: false });
}

/** One socket per tab. On every reconnect the whole query cache is refetched so missed events are recovered. */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [socket] = useState(createSocket);
  const [conn, setConn] = useState<ConnState>({ status: "reconnecting", disconnectedSince: null });

  useEffect(() => {
    if (!socket) return;
    let offlineTimer: ReturnType<typeof setTimeout> | undefined;
    let connectedBefore = false;

    const onConnect = () => {
      clearTimeout(offlineTimer);
      setConn({ status: "live", disconnectedSince: null });
      // Rule 3: refetch snapshots after every reconnect (the first load already fetched them).
      if (connectedBefore) void qc.invalidateQueries();
      connectedBefore = true;
    };
    const onDown = () => {
      setConn((c) => ({
        status: c.status === "offline" ? "offline" : "reconnecting",
        disconnectedSince: c.disconnectedSince ?? Date.now(),
      }));
      clearTimeout(offlineTimer);
      offlineTimer = setTimeout(() => setConn((c) => ({ ...c, status: "offline" })), OFFLINE_AFTER_MS);
    };
    const onConnectError = (err: Error) => {
      if (err.message === "UNAUTHORIZED") {
        // Session expired or logged out in another tab.
        socket.disconnect();
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      onDown();
    };
    const onOffline = () => setConn((c) => ({ status: "offline", disconnectedSince: c.disconnectedSince ?? Date.now() }));
    // Back on the network: the old WebSocket may be half-open, so start a fresh connection.
    // Its "connect" handler refetches every snapshot, recovering anything missed while offline.
    const onOnline = () => {
      socket.disconnect();
      socket.connect();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDown);
    socket.on("connect_error", onConnectError);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    socket.connect();

    return () => {
      clearTimeout(offlineTimer);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDown);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [socket, qc, router]);

  return <Ctx.Provider value={{ socket, ...conn }}>{children}</Ctx.Provider>;
}

export function useSocketContext(): SocketCtx {
  return useContext(Ctx);
}
