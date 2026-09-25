export type OrderStatus = "PLACED" | "PREPARING" | "READY" | "COLLECTED" | "CANCELLED" | "REJECTED";
export type Role = "STUDENT" | "STAFF" | "ADMIN";

export interface OrderDTO {
  id: string;
  tokenNumber: number;
  status: OrderStatus;
  version: number;
  totalPaise: number;
  note: string | null;
  rejectReason: string | null;
  studentFirstName: string;
  items: { name: string; quantity: number; unitPricePaise: number }[];
  createdAt: string; // ISO strings for every date
  preparingAt: string | null;
  readyAt: string | null;
  collectedAt: string | null;
  closedAt: string | null;
  billNumber: string | null; // set once COLLECTED
}

export interface MenuItemDTO {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  pricePaise: number;
  isVeg: boolean;
  imageUrl: string | null;
  modelKey: string | null;
  prepMinutes: number;
  isAvailable: boolean;
  stock: number | null;
  sortOrder: number;
}

export interface Presence {
  kitchen: number;
  students: number;
}

export interface StatsDTO {
  ordersToday: number;
  revenueTodayPaise: number;
  activeOrders: number;
  avgPrepSecondsToday: number | null;
  cancelledOrRejectedToday: number;
  ordersPerHour: { hour: number; count: number }[]; // 0-23, canteen timezone
  topItems: { name: string; quantity: number }[]; // top 5
  presence: Presence;
}

export interface CanteenStatus {
  isOpen: boolean;
  closedMessage: string | null;
  canteenName: string;
}

export interface ServerToClientEvents {
  "order:created": (order: OrderDTO) => void;
  "order:updated": (order: OrderDTO) => void;
  "queue:update": (q: { orderId: string; position: number; etaMinutes: number }) => void;
  "menu:item-updated": (item: MenuItemDTO) => void;
  "menu:changed": (p: { reason: string }) => void;
  "canteen:status": (s: CanteenStatus) => void;
  "stats:update": (s: StatsDTO) => void;
  "presence:update": (p: Presence) => void;
}

/** Wire format: the server sends JSON frames { e: event, d: payload }. Clients never send events. */
export type ServerFrame = { [E in keyof ServerToClientEvents]: { e: E; d: Parameters<ServerToClientEvents[E]>[0] } }[keyof ServerToClientEvents];
