import type { MenuItem, Order, OrderItem, User, Bill } from "@prisma/client";
import type { MenuItemDTO, OrderDTO, OrderStatus } from "./realtime/events";
import { firstNameOf } from "./session";

export type OrderWithRelations = Order & {
  items: OrderItem[];
  user: Pick<User, "name">;
  bill?: Pick<Bill, "billNumber"> | null;
};

export const orderInclude = {
  items: true,
  user: { select: { name: true } },
  bill: { select: { billNumber: true } },
} as const;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export function toOrderDTO(o: OrderWithRelations): OrderDTO {
  return {
    id: o.id,
    tokenNumber: o.tokenNumber,
    status: o.status as OrderStatus,
    version: o.version,
    totalPaise: o.totalPaise,
    note: o.note,
    rejectReason: o.rejectReason,
    studentFirstName: firstNameOf(o.user.name),
    items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPricePaise: i.unitPricePaise })),
    createdAt: o.createdAt.toISOString(),
    preparingAt: iso(o.preparingAt),
    readyAt: iso(o.readyAt),
    collectedAt: iso(o.collectedAt),
    closedAt: iso(o.closedAt),
    billNumber: o.bill?.billNumber ?? null,
  };
}

export function toMenuItemDTO(m: MenuItem): MenuItemDTO {
  return {
    id: m.id,
    categoryId: m.categoryId,
    name: m.name,
    description: m.description,
    pricePaise: m.pricePaise,
    isVeg: m.isVeg,
    imageUrl: m.imageUrl,
    modelKey: m.modelKey,
    prepMinutes: m.prepMinutes,
    isAvailable: m.isAvailable,
    stock: m.stock,
    sortOrder: m.sortOrder,
  };
}

/** An item can be ordered only when available, not archived, and stock is unlimited or > 0. */
export function isOrderable(m: Pick<MenuItem, "isAvailable" | "isArchived" | "stock">): boolean {
  return m.isAvailable && !m.isArchived && (m.stock === null || m.stock > 0);
}
