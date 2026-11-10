"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requestReturn } from "@/lib/returns";
import { safeSend } from "@/lib/supplier-email";
import { sendReturnMail } from "@/lib/return-email";

// Demande de retour d'un colis livré (30 jours) : propriétaire vérifié côté serveur.
export async function requestReturnAction(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  const id = String(formData.get("id") ?? "");
  const r = await requestReturn(db, userId, id, String(formData.get("reason") ?? ""));
  if (r.ok) {
    const sub = await db.subOrder.findUnique({ where: { id }, select: { number: true } });
    const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    for (const a of admins) await safeSend(a, `E póm ta’ — retour demandé ${sub?.number ?? ""}`, [`Un client demande le retour du colis ${sub?.number ?? ""}. À traiter dans l'administration (Retours).`]);
    await sendReturnMail(id, "requested", undefined, session.user?.email ?? undefined);
  }
  revalidatePath("/", "layout");
}
