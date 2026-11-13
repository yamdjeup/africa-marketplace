import type { PrismaClient } from "@prisma/client";
import { createPayout } from "@/lib/ledger";
import { canPayOut, connectEnabled, createTransfer } from "@/lib/stripe-connect";

type Payout = { id: string; amountCents: number; reference: string };
type Deps = {
  stripeEnabled: boolean;
  createPayout: (db: PrismaClient, supplierId: string, paidBy: string) => Promise<Payout | null>;
  transfer: (i: { payoutId: string; accountId: string; amountCents: number }) => Promise<{ id: string }>;
};
export type PayoutResult = { ok: true; payout: Payout; transferId: string | null } | { ok: false; reason: "kyc" | "nothing" | "transfer" };

/** Versement : bloqué tant que le compte Stripe n'est pas vérifié ; transfert Stripe puis, en cas d'échec, annulation du registre (rien n'est marqué versé). */
export async function payOutSupplier(
  db: PrismaClient,
  supplier: { id: string; stripeAccountId: string | null; stripeConnectStatus: string },
  paidBy: string,
  deps: Deps = { stripeEnabled: connectEnabled(), createPayout, transfer: (i) => createTransfer(i) },
): Promise<PayoutResult> {
  if (!canPayOut(supplier.stripeConnectStatus, deps.stripeEnabled) || (deps.stripeEnabled && !supplier.stripeAccountId)) return { ok: false, reason: "kyc" };
  const payout = await deps.createPayout(db, supplier.id, paidBy);
  if (!payout) return { ok: false, reason: "nothing" };
  if (!deps.stripeEnabled) return { ok: true, payout, transferId: null };
  try {
    const t = await deps.transfer({ payoutId: payout.id, accountId: supplier.stripeAccountId!, amountCents: payout.amountCents });
    await db.payout.update({ where: { id: payout.id }, data: { stripeTransferId: t.id } });
    return { ok: true, payout, transferId: t.id };
  } catch (e) {
    console.error("[payout]", e instanceof Error ? e.message : e);
    await db.$transaction([
      db.ledgerEntry.updateMany({ where: { payoutId: payout.id }, data: { payoutId: null } }),
      db.payout.delete({ where: { id: payout.id } }),
    ]);
    return { ok: false, reason: "transfer" };
  }
}
