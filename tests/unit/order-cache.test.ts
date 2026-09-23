import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { applyOrderEvent, BOARD_KEY, orderKey, type BoardData, type OrderViewData } from "@/lib/order-cache";
import type { OrderDTO } from "@/lib/realtime/events";

const base: OrderDTO = {
  id: "o1",
  tokenNumber: 101,
  status: "PLACED",
  version: 1,
  totalPaise: 5000,
  note: null,
  rejectReason: null,
  studentFirstName: "Asha",
  items: [],
  createdAt: "2026-09-23T06:00:00.000Z",
  preparingAt: null,
  readyAt: null,
  collectedAt: null,
  closedAt: null,
  billNumber: null,
};

describe("applyOrderEvent", () => {
  it("applies newer versions and drops stale or out-of-order ones", () => {
    const qc = new QueryClient();
    qc.setQueryData<OrderViewData>(orderKey("o1"), { order: base, queue: { position: 2, etaMinutes: 6 } });
    applyOrderEvent(qc, { ...base, status: "READY", version: 3 });
    applyOrderEvent(qc, { ...base, status: "PREPARING", version: 2 }); // late event
    const d = qc.getQueryData<OrderViewData>(orderKey("o1"))!;
    expect(d.order.status).toBe("READY");
    expect(d.queue).toBeNull();
  });

  it("moves an order from the board to done when collected", () => {
    const qc = new QueryClient();
    qc.setQueryData<BoardData>(BOARD_KEY, { orders: [{ ...base, status: "READY", version: 3 }], done: [] });
    applyOrderEvent(qc, { ...base, status: "COLLECTED", version: 4, billNumber: "CCL-20260923-101" });
    const b = qc.getQueryData<BoardData>(BOARD_KEY)!;
    expect(b.orders).toHaveLength(0);
    expect(b.done[0].billNumber).toBe("CCL-20260923-101");
  });

  it("applying the same event twice is harmless", () => {
    const qc = new QueryClient();
    qc.setQueryData<BoardData>(BOARD_KEY, { orders: [], done: [] });
    const e = { ...base, version: 1 };
    applyOrderEvent(qc, e);
    applyOrderEvent(qc, e);
    expect(qc.getQueryData<BoardData>(BOARD_KEY)!.orders).toHaveLength(1);
  });
});
