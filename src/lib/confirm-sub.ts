import type { PrismaClient } from "@prisma/client";
import { captureOnConfirm } from "./payment-mode";
import { settleOrderPayment } from "./payment-capture";
import { acceptSub, prepareSub } from "./suborders";
import { notifySubOrder } from "./order-notify";

/** Confirmation par le créateur : encaissement (si autorisation), puis e-mail « Confirmée » et passage automatique « En préparation » avec son propre e-mail. */
export async function confirmSubOrder(db: PrismaClient, id: string, supplierId: string | null) {
  const sub = await acceptSub(db, id, supplierId);
  if (!sub) return false;
  if (!captureOnConfirm()) {
    await notifySubOrder("ACCEPTED", id);
    return true;
  }
  await settleOrderPayment(db, sub.orderId);
  await notifySubOrder("ACCEPTED", id);
  if (await prepareSub(db, id, supplierId)) await notifySubOrder("PREPARING", id);
  return true;
}
