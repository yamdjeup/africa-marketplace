import { simulatedStatus } from "@/lib/order-status";
import { db } from "@/lib/db";

type EditableOrder = { createdAt: Date; editToken: string | null; userId: string | null };

// Adresse non modifiable dès qu'une sous-commande est annulée, refusée, expirée, expédiée ou livrée.
export async function hasLockedSubOrder(orderId: string) {
  return (await db.subOrder.count({ where: { orderId, status: { in: ["CANCELLED", "REFUSED", "EXPIRED", "SHIPPED", "DELIVERED"] } } })) > 0;
}

export function isAddressEditable(createdAt: Date) {
  const s = simulatedStatus(createdAt);
  return s === "CONFIRMED" || s === "PREPARING";
}

// Autorisation de modifier : jeton reçu à la commande (invité) ou propriétaire connecté.
export function isOrderOwner(order: EditableOrder, token: string | undefined, userId: string | undefined) {
  return Boolean((token && order.editToken && token === order.editToken) || (userId && order.userId === userId));
}
