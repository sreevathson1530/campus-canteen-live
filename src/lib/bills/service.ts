import { prisma, type Tx } from "../db";
import { apiError } from "../api";
import { maskPhone } from "../otp/service";
import { caseVariants } from "../search";
import type { Role } from "../realtime/events";

/** "CCL-YYYYMMDD-<token>" from the order's business date. Unique because (date, token) is unique. */
export function billNumberFor(businessDate: string, token: number): string {
  return `CCL-${businessDate.replaceAll("-", "")}-${token}`;
}

/**
 * Created inside the READY -> COLLECTED transaction. Every value is copied from the order and user
 * at this moment, so later name, phone or price changes never alter the bill.
 */
export async function createBillInTx(tx: Tx, orderId: string, collectedByName: string, collectedAt: Date) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, user: { select: { name: true, phone: true } } },
  });
  return tx.bill.create({
    data: {
      billNumber: billNumberFor(order.businessDate, order.tokenNumber),
      orderId: order.id,
      tokenNumber: order.tokenNumber,
      studentName: order.user.name,
      studentPhone: order.user.phone ?? "",
      totalPaise: order.totalPaise,
      orderedAt: order.createdAt,
      readyAt: order.readyAt,
      collectedAt,
      collectedByName,
      lines: {
        create: order.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPricePaise: i.unitPricePaise,
          lineTotalPaise: i.unitPricePaise * i.quantity,
        })),
      },
    },
  });
}

export interface BillDTO {
  billNumber: string;
  orderId: string;
  tokenNumber: number;
  studentName: string;
  studentPhone: string;
  totalPaise: number;
  orderedAt: string;
  readyAt: string | null;
  collectedAt: string;
  collectedByName: string;
  canteenName: string;
  lines: { name: string; quantity: number; unitPricePaise: number; lineTotalPaise: number }[];
}

type BillRow = Awaited<ReturnType<typeof loadBill>>;

async function loadBill(where: { orderId: string } | { billNumber: string }) {
  return prisma.bill.findUnique({ where, include: { lines: true, order: { select: { userId: true } } } });
}

function toBillDTO(b: NonNullable<BillRow>, canteenName: string, maskContact: boolean): BillDTO {
  return {
    billNumber: b.billNumber,
    orderId: b.orderId,
    tokenNumber: b.tokenNumber,
    studentName: b.studentName,
    studentPhone: maskContact ? maskPhone(b.studentPhone) : b.studentPhone,
    totalPaise: b.totalPaise,
    orderedAt: b.orderedAt.toISOString(),
    readyAt: b.readyAt?.toISOString() ?? null,
    collectedAt: b.collectedAt.toISOString(),
    collectedByName: b.collectedByName,
    canteenName,
    lines: b.lines.map((l) => ({ name: l.name, quantity: l.quantity, unitPricePaise: l.unitPricePaise, lineTotalPaise: l.lineTotalPaise })),
  };
}

/** Owner and ADMIN see everything; STAFF see a masked phone; other students get 403. 404 before COLLECTED. */
export async function getBillForViewer(orderId: string, viewer: { id: string; role: Role }): Promise<BillDTO> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
  if (!order) apiError("NOT_FOUND", "Order not found");
  if (viewer.role === "STUDENT" && order.userId !== viewer.id) apiError("FORBIDDEN", "This isn't your order");
  const bill = await loadBill({ orderId });
  if (!bill) apiError("NOT_FOUND", "The bill is created when the order is collected");
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return toBillDTO(bill, settings?.canteenName ?? "Campus Canteen", viewer.role === "STAFF");
}

export async function searchBills(opts: { q?: string; date?: string; page?: number; pageSize?: number }) {
  const pageSize = Math.min(opts.pageSize ?? 20, 50);
  const page = Math.max(opts.page ?? 1, 1);
  const q = opts.q?.trim();
  const digits = q?.replace(/\D/g, "");
  const where = {
    AND: [
      opts.date ? { billNumber: { startsWith: `CCL-${opts.date.replaceAll("-", "")}-` } } : {},
      q
        ? {
            OR: [
              { billNumber: { contains: q.toUpperCase() } },
              ...caseVariants(q).map((v) => ({ studentName: { contains: v } })),
              ...(digits && digits.length >= 3 ? [{ studentPhone: { contains: digits } }] : []),
            ],
          }
        : {},
    ],
  };
  const [total, rows, settings] = await Promise.all([
    prisma.bill.count({ where }),
    prisma.bill.findMany({
      where,
      include: { lines: true, order: { select: { userId: true } } },
      orderBy: { collectedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  const name = settings?.canteenName ?? "Campus Canteen";
  return { total, page, pageSize, bills: rows.map((b) => toBillDTO(b, name, false)) };
}
