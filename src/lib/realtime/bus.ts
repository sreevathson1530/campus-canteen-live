// The event bus between writers (route handlers) and WebSocket hubs.
// - Locally (one process) it's an in-memory EventEmitter on globalThis, shared across Next's module instances.
// - On Vercel, WebSockets are pinned to function instances and route handlers may run elsewhere, so events
//   travel over Redis pub/sub (REDIS_URL / KV_URL) and every instance's hub delivers to its own sockets.
import { EventEmitter } from "node:events";
import type Redis from "ioredis";

export interface BusMessage {
  rooms: string[];
  event: string;
  payload: unknown;
}

type Handler = (m: BusMessage) => void;

const CHANNEL = "ccl:events";

const g = globalThis as unknown as {
  __cclBus?: EventEmitter;
  __cclRedisPub?: Promise<Redis>;
  __cclRedisSub?: Promise<Redis>;
  __cclRedisHandlers?: Set<Handler>;
};

export function redisUrl(): string | null {
  return process.env.REDIS_URL || process.env.KV_URL || null;
}

async function makeRedis(): Promise<Redis> {
  const { default: IORedis } = await import("ioredis");
  const client = new IORedis(redisUrl()!, { maxRetriesPerRequest: 3, enableAutoPipelining: true, lazyConnect: false });
  client.on("error", (e) => console.error("[redis]", e.message));
  return client;
}

/** A shared Redis command client (also used for rate limits and presence). Null when running without Redis. */
export function getRedis(): Promise<Redis> | null {
  if (!redisUrl()) return null;
  g.__cclRedisPub ??= makeRedis();
  return g.__cclRedisPub;
}

export async function publish(m: BusMessage): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await (await redis).publish(CHANNEL, JSON.stringify(m));
    return;
  }
  (g.__cclBus ??= new EventEmitter().setMaxListeners(0)).emit("message", m);
}

/** Subscribes a hub to every bus message. Returns an unsubscribe function. */
export function subscribe(handler: Handler): () => void {
  if (!redisUrl()) {
    const bus = (g.__cclBus ??= new EventEmitter().setMaxListeners(0));
    bus.on("message", handler);
    return () => bus.off("message", handler);
  }
  const handlers = (g.__cclRedisHandlers ??= new Set());
  handlers.add(handler);
  g.__cclRedisSub ??= makeRedis().then(async (sub) => {
    sub.on("message", (_channel: string, raw: string) => {
      let m: BusMessage;
      try {
        m = JSON.parse(raw);
      } catch {
        return;
      }
      for (const h of g.__cclRedisHandlers ?? []) h(m);
    });
    await sub.subscribe(CHANNEL);
    return sub;
  });
  return () => handlers.delete(handler);
}
