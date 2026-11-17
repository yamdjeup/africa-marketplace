import { db } from "@/lib/db";
import { notifySubOrder } from "@/lib/order-notify";
import { partnerRecipient } from "@/lib/partner-recipient";
import { settleSubRefund } from "@/lib/refund";
import { sendPartnerReturnMail, sendReturnMail } from "@/lib/return-email";
import { requestReturn } from "@/lib/returns";
import { cancelSub } from "@/lib/suborders";
import { safeSend } from "@/lib/supplier-email";

const CUSTOMER_CANCEL_REASON = "Annulée par le client depuis son compte";

// Annulation par le client d'un colis non expédié : propriétaire vérifié, statut contrôlé en base (anti-course).
// Partagé par la Server Action du site (cancel-actions.ts) et l'API mobile.
export async function cancelParcelForUser(userId: string, email: string | null | undefined, id: string): Promise<boolean> {
  const sub = await db.subOrder.findUnique({ where: { id }, include: { order: { select: { userId: true, number: true, stripePaymentIntentId: true } } } });
  if (!sub || sub.order.userId !== userId) return false;
  const done = await cancelSub(db, id, CUSTOMER_CANCEL_REASON, { id: userId, label: `client ${email ?? userId}` });
  if (!done) return false;
  await settleSubRefund(id);
  await notifySubOrder("CANCELLED", id);
  const supplier = await db.supplier.findUnique({ where: { id: sub.supplierId } });
  const owner = supplier?.userId ? await db.user.findUnique({ where: { id: supplier.userId } }) : null;
  const to = supplier ? partnerRecipient(supplier, owner?.email) : null;
  if (to) await safeSend(to, `E póm ta’ — commande ${sub.number} annulée par le client`, [`Bonjour ${supplier?.displayName ?? ""},`, `Le client a annulé la commande ${sub.number} avant expédition. Merci de ne pas la préparer ; le stock réservé est libéré.`]);
  return true;
}

// Demande de retour d'un colis livré (30 jours) : propriétaire vérifié côté serveur, e-mails comme sur le site.
export async function requestReturnForUser(userId: string, email: string | null | undefined, id: string, reason: string) {
  const r = await requestReturn(db, userId, id, reason);
  if (r.ok) {
    const sub = await db.subOrder.findUnique({ where: { id }, select: { number: true } });
    const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    for (const a of admins) await safeSend(a, `E póm ta’ — retour demandé ${sub?.number ?? ""}`, [`Un client demande le retour du colis ${sub?.number ?? ""}. À traiter dans l'administration (Retours).`]);
    await sendReturnMail(id, "requested", undefined, email ?? undefined);
    await sendPartnerReturnMail(id, "requested");
  }
  return r;
}
