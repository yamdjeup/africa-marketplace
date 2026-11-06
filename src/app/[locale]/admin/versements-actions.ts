"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createPayout } from "@/lib/ledger";
import { isAdminEmail } from "@/lib/supplier";
import { emailPartnerPayout } from "@/lib/supplier-email";

const path = "/fr/admin/versements";

async function admin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
  return session!.user!.email!;
}

// Marque le versement (test) de tout le solde disponible d'un partenaire.
export async function markPayoutAction(f: FormData) {
  const email = await admin();
  const supplierId = String(f.get("supplierId") ?? "");
  const payout = await createPayout(db, supplierId, email);
  if (!payout) redirect(`${path}?error=nothing`);
  const s = await db.supplier.findUnique({ where: { id: supplierId }, include: { user: { select: { email: true } } } });
  if (s?.user?.email) await emailPartnerPayout({ email: s.user.email, name: s.displayName, locale: "fr" }, payout.amountCents, payout.reference);
  revalidatePath(path);
  redirect(`${path}?ok=paid`);
}

// Test : rend disponible immédiatement un gain encore dans le délai de retour.
export async function releaseEntryAction(f: FormData) {
  await admin();
  const id = String(f.get("id") ?? "");
  await db.ledgerEntry.updateMany({ where: { id, payoutId: null, reversedAt: null }, data: { availableAt: new Date() } });
  revalidatePath(path);
  redirect(`${path}?ok=released`);
}

export async function setCommissionAction(f: FormData) {
  await admin();
  const id = String(f.get("supplierId") ?? "");
  const pct = Number(String(f.get("rate") ?? "").replace(",", "."));
  if (!Number.isFinite(pct) || pct < 0 || pct > 50) redirect(`${path}?error=rate`);
  await db.supplier.update({ where: { id }, data: { commissionRate: Math.round(pct * 10) / 1000 } });
  revalidatePath(path);
  redirect(`${path}?ok=rate`);
}
