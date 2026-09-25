"use client";

import type { ServerToClientEvents } from "./events";

type Lifecycle = {
  connect: () => void;
  disconnect: () => void;
  connect_error: (err: Error) => void;
};
type Events = ServerToClientEvents & Lifecycle;
type Listener = (...args: never[]) => void;

const WATCHDOG_MS = 50_000; // the server sends a ping every 20 s
const MAX_BACKOFF_MS = 30_000;

/**
 * Browser WebSocket to /api/ws with automatic reconnect, exponential backoff and a heartbeat watchdog.
 * Mirrors the small subset of the Socket.IO client API the app uses: on/off, connect/disconnect.
 * Server frames are JSON { e, d }; the client never sends events.
 */
export class LiveSocket {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private wanted = false;
  private attempt = 0;
  private everOpened = false;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  connected = false;

  on<E extends keyof Events>(event: E, fn: Events[E]): void {
    let set = this.listeners.get(event as string);
    if (!set) this.listeners.set(event as string, (set = new Set()));
    set.add(fn as unknown as Listener);
  }

  off<E extends keyof Events>(event: E, fn: Events[E]): void {
    this.listeners.get(event as string)?.delete(fn as unknown as Listener);
  }

  private emit(event: string, ...args: unknown[]): void {
    for (const fn of [...(this.listeners.get(event) ?? [])]) (fn as (...a: unknown[]) => void)(...args);
  }

  connect(): void {
    this.wanted = true;
    clearTimeout(this.retryTimer);
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return;
    this.open();
  }

  disconnect(): void {
    this.wanted = false;
    clearTimeout(this.retryTimer);
    clearTimeout(this.watchdog);
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
    if (this.connected) {
      this.connected = false;
      this.emit("disconnect");
    }
  }

  private open(): void {
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/ws`;
    const ws = new WebSocket(url);
    this.ws = ws;
    let opened = false;

    ws.onmessage = (ev) => {
      this.kick();
      let frame: { e: string; d?: unknown };
      try {
        frame = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (frame.e === "ready") {
        opened = true;
        this.everOpened = true;
        this.attempt = 0;
        this.connected = true;
        this.emit("connect");
        return;
      }
      if (frame.e === "ping") return;
      this.emit(frame.e, frame.d);
    };

    ws.onclose = () => {
      clearTimeout(this.watchdog);
      if (this.ws === ws) this.ws = null;
      const wasConnected = this.connected;
      this.connected = false;
      if (wasConnected) this.emit("disconnect");
      if (!this.wanted) return;
      if (!opened) void this.checkAuthThenRetry();
      else this.scheduleRetry();
    };
    ws.onerror = () => undefined; // onclose follows
    this.kick();
  }

  /** A connection that never opened may mean the session expired: ask the API before retrying. */
  private async checkAuthThenRetry(): Promise<void> {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (res.status === 401) {
        this.wanted = false;
        this.emit("connect_error", new Error("UNAUTHORIZED"));
        return;
      }
    } catch {
      // Offline: fall through to a normal retry.
    }
    this.emit("connect_error", new Error(this.everOpened ? "RECONNECT_FAILED" : "CONNECT_FAILED"));
    this.scheduleRetry();
  }

  private scheduleRetry(): void {
    clearTimeout(this.retryTimer);
    const base = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.attempt++);
    const delay = base / 2 + Math.random() * (base / 2);
    this.retryTimer = setTimeout(() => this.wanted && this.open(), delay);
  }

  /** Restarts the watchdog: if nothing (not even a ping) arrives in time, the link is dead. */
  private kick(): void {
    clearTimeout(this.watchdog);
    this.watchdog = setTimeout(() => this.ws?.close(), WATCHDOG_MS);
  }
}
