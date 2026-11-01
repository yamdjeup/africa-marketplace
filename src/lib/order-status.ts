export const ORDER_STATUSES = ["CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Simulation : le statut évolue avec l'ancienneté de la commande (en minutes).
const THRESHOLDS_MIN: Record<OrderStatus, number> = { CONFIRMED: 0, PREPARING: 2, SHIPPED: 10, DELIVERED: 60 };

export function simulatedStatus(createdAt: Date, now: Date = new Date()): OrderStatus {
  const minutes = (now.getTime() - createdAt.getTime()) / 60000;
  return [...ORDER_STATUSES].reverse().find((s) => minutes >= THRESHOLDS_MIN[s]) ?? "CONFIRMED";
}
