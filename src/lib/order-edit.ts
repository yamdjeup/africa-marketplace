import { simulatedStatus } from "@/lib/order-status";

type EditableOrder = { createdAt: Date; editToken: string | null; userId: string | null };

export function isAddressEditable(createdAt: Date) {
  const s = simulatedStatus(createdAt);
  return s === "CONFIRMED" || s === "PREPARING";
}

// Autorisation de modifier : jeton reçu à la commande (invité) ou propriétaire connecté.
export function isOrderOwner(order: EditableOrder, token: string | undefined, userId: string | undefined) {
  return Boolean((token && order.editToken && token === order.editToken) || (userId && order.userId === userId));
}
