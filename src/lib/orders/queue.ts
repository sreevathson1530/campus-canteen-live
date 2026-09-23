/** The queue: today's PLACED and PREPARING orders, oldest first. */
export interface QueueEntry {
  id: string;
  userId: string;
  createdAt: Date;
}

export interface QueuePosition {
  orderId: string;
  userId: string;
  position: number;
  etaMinutes: number;
}

/** position = index in the queue + 1; etaMinutes = position × minutesPerOrder. */
export function queuePositions(queue: QueueEntry[], minutesPerOrder: number): QueuePosition[] {
  return [...queue]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
    .map((o, i) => ({ orderId: o.id, userId: o.userId, position: i + 1, etaMinutes: (i + 1) * minutesPerOrder }));
}
