"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notifySubOrder } from "@/lib/order-notify";
import { settleSubRefund } from "@/lib/refund";
import { cancelSub } from "@/lib/suborders";
import { safeSend } from "@/lib/supplier-email";

const CUSTOMER_CANCEL_REASON = "Annulée par le client depuis son compte";

// Annulation par le client d'un colis non expédié : propriétaire vérifié, statut contrôlé en base (anti-course).
export async function cancelMySubOrder(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  const id = String(formData.get("id") ?? "");
  const sub = await db.subOrder.findUnique({ where: { id }, include: { order: { select: { userId: true, number: true, stripePaymentIntentId: true } } } });
  if (!sub || sub.order.userId !== userId) return;
  const done = await cancelSub(db, id, CUSTOMER_CANCEL_REASON, { id: userId, label: `client ${session?.user?.email ?? userId}` });
  if (!done) {
    revalidatePath("/", "layout");
    return;
  }
  await settleSubRefund(id);
  await notifySubOrder("CANCELLED", id);
  const supplier = await db.supplier.findUnique({ where: { id: sub.supplierId } });
  const owner = supplier?.userId ? await db.user.findUnique({ where: { id: supplier.userId } }) : null;
  if (owner?.email) await safeSend(owner.email, `E póm ta’ — commande ${sub.number} annulée par le client`, [`Bonjour ${supplier?.displayName ?? ""},`, `Le client a annulé la commande ${sub.number} avant expédition. Merci de ne pas la préparer ; le stock réservé est libéré.`]);
  revalidatePath("/", "layout");
}
