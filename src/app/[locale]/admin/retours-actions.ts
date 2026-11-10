"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { refundSubOrder } from "@/lib/refund";
import { decideReturn, markReturnRefundedManually, refundReturn } from "@/lib/returns";
import { isAdminEmail } from "@/lib/supplier";
import { safeSend } from "@/lib/supplier-email";

const path = "/fr/admin/retours";

async function admin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
}

async function notifyCustomer(returnId: string, subject: string, lines: string[]) {
  const ret = await db.returnRequest.findUnique({ where: { id: returnId }, include: { subOrder: { include: { order: { select: { email: true } } } } } });
  if (ret) await safeSend(ret.subOrder.order.email, `E póm ta’ — ${subject} ${ret.subOrder.number}`, ["Bonjour,", ...lines]);
}

export async function decideReturnAction(f: FormData) {
  await admin();
  const id = String(f.get("id") ?? "");
  const decision = f.get("decision") === "ACCEPTED" ? "ACCEPTED" : "REFUSED";
  const note = String(f.get("note") ?? "");
  const done = await decideReturn(db, id, decision, note);
  if (!done) redirect(`${path}?error=state`);
  await notifyCustomer(id, "votre demande de retour", decision === "ACCEPTED"
    ? ["Votre demande de retour est acceptée. Vous serez remboursé après réception et contrôle du colis."]
    : ["Votre demande de retour n'a pas pu être acceptée.", ...(note.trim() ? [`Motif : ${note.trim()}`] : [])]);
  revalidatePath(path);
  redirect(`${path}?ok=${decision === "ACCEPTED" ? "accepted" : "refused"}`);
}

export async function refundReturnAction(f: FormData) {
  await admin();
  const id = String(f.get("id") ?? "");
  const manual = f.get("manual") === "1";
  const r = manual ? await markReturnRefundedManually(db, id) : await refundReturn(db, id, refundSubOrder);
  if (!r) redirect(`${path}?error=state`);
  if (!r.done) redirect(`${path}?error=refund`);
  await notifyCustomer(id, "remboursement de votre retour", ["Votre retour est remboursé sur votre moyen de paiement sous 5 à 10 jours ouvrés."]);
  revalidatePath(path);
  redirect(`${path}?ok=refunded`);
}
