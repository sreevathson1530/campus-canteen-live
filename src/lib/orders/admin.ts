import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { orderInclude, toOrderDTO } from "../dto";
import { caseVariants } from "../search";
import { businessDate } from "../time";
import type { OrderDTO, OrderStatus } from "../realtime/events";

export type OrderRange = "active" | "today" | "week" | "month" | "all";
export const ORDER_RANGES: OrderRange[] = ["active", "today", "week", "month", "all"];
const STATUSES: OrderStatus[] = ["PLACED", "PREPARING", "READY", "COLLECTED", "CANCELLED", "REJECTED"];

export interface AdminOrderDTO extends OrderDTO {
  businessDate: string;
  student: { name: string; email: string; phone: string | null };
  bill: { billNumber: string; emailedAt: string | null } | null;
}

export interface Earnings {
  revenuePaise: number; // collected orders only
  orders: number; // collected orders
}

/** Monday of the week containing a "YYYY-MM-DD" business date. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function rangeWhere(range: OrderRange, today: string): Prisma.OrderWhereInput {
  switch (range) {
    case "active":
      return { status: { in: ["PLACED", "PREPARING", "READY"] } };
    case "today":
      return { businessDate: today };
    case "week":
      return { businessDate: { gte: weekStart(today), lte: today } };
    case "month":
      return { businessDate: { gte: monthStart(today), lte: today } };
    default:
      return {};
  }
}

async function earningsSince(from: string, to: string): Promise<Earnings> {
  const r = await prisma.order.aggregate({
    where: { status: "COLLECTED", businessDate: { gte: from, lte: to } },
    _sum: { totalPaise: true },
    _count: true,
  });
  return { revenuePaise: r._sum.totalPaise ?? 0, orders: r._count };
}

/** Collected revenue today, this week (from Monday) and this month, in the canteen's timezone. */
export async function computeEarnings(now: Date = new Date()) {
  const today = businessDate(now);
  const [day, week, month] = await Promise.all([
    earningsSince(today, today),
    earningsSince(weekStart(today), today),
    earningsSince(monthStart(today), today),
  ]);
  return { today, day, week, month };
}

export async function listAdminOrders(opts: { range?: string; status?: string; q?: string; page?: number }) {
  const range: OrderRange = ORDER_RANGES.includes(opts.range as OrderRange) ? (opts.range as OrderRange) : "active";
  const status = STATUSES.includes(opts.status as OrderStatus) ? (opts.status as OrderStatus) : undefined;
  const pageSize = 25;
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q?.trim();
  const today = businessDate();

  const search: Prisma.OrderWhereInput[] = [];
  if (q) {
    const digits = q.replace(/\D/g, "");
    if (/^\d{1,5}$/.test(q)) search.push({ tokenNumber: Number(q) });
    if (digits.length >= 3) search.push({ user: { phone: { contains: digits } } });
    for (const v of caseVariants(q)) {
      search.push({ user: { name: { contains: v } } }, { user: { email: { contains: v } } });
    }
    search.push({ bill: { billNumber: { contains: q.toUpperCase() } } });
  }
  const where: Prisma.OrderWhereInput = {
    AND: [rangeWhere(range, today), status ? { status } : {}, search.length ? { OR: search } : {}],
  };

  const [total, rows, counts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        ...orderInclude,
        user: { select: { name: true, email: true, phone: true } },
        bill: { select: { billNumber: true, emailedAt: true } },
      },
      // Active: oldest first, like the kitchen queue. History: newest first.
      orderBy: range === "active" ? { createdAt: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.groupBy({ by: ["status"], where: rangeWhere(range, today), _count: true }),
  ]);

  const orders: AdminOrderDTO[] = rows.map((o) => ({
    ...toOrderDTO(o),
    businessDate: o.businessDate,
    student: { name: o.user.name, email: o.user.email, phone: o.user.phone },
    bill: o.bill ? { billNumber: o.bill.billNumber, emailedAt: o.bill.emailedAt?.toISOString() ?? null } : null,
  }));
  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, counts.find((c) => c.status === s)?._count ?? 0])) as Record<OrderStatus, number>;
  return { range, status: status ?? null, page, pageSize, total, hasMore: page * pageSize < total, statusCounts, orders };
}
