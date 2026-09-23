"use client";

import { useEffect, useRef } from "react";
import type { ServerToClientEvents } from "@/lib/realtime/events";
import { useSocketContext } from "@/providers/SocketProvider";

/** Subscribes to one typed server event for the lifetime of the component. */
export function useSocketEvent<E extends keyof ServerToClientEvents>(
  event: E,
  handler: ServerToClientEvents[E],
): void {
  const { socket } = useSocketContext();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });

  useEffect(() => {
    if (!socket) return;
    const listener = ((...args: unknown[]) => (ref.current as (...a: unknown[]) => void)(...args)) as never;
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);
}

export function useConnectionStatus() {
  const { status, disconnectedSince } = useSocketContext();
  return { status, disconnectedSince };
}
