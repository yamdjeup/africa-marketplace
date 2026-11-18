"use server";

import { cleanTrackingNumber } from "@/lib/tracking";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notifySubOrder } from "@/lib/order-notify";
import { settleSubRefund } from "@/lib/refund";
import { acceptSub, deliverSub, prepareSub, refuseSub, shipSub } from "@/lib/suborders";
import { findActiveReason } from "@/lib/refusal-reasons";
import { markReturnReceivedByPartner, partnerDecideReturn } from "@/lib/returns";
import { sendReturnMail } from "@/lib/return-email";
import { getPortalContext } from "@/lib/supplier";

const s = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);

async function ctxOf(f: FormData) {
  const locale = s(f, "locale") === "en" ? "en" : "fr";
  const ctx = await getPortalContext();
  if (!ctx) redirect(`/${locale}/fournisseur`);
  const id = s(f, "id", 40);
  const back = (q: string) => `/${locale}/fournisseur/commandes/${id}${q}`;
  // Lecture seule en mode « voir comme » ; chaque transition est filtrée par propriétaire (supplierId).
  if (ctx.viewingAs) redirect(back("?error=readonly"));
  const session = await auth();
  return { id, supplierId: ctx.supplier.id, back, actor: { id: session?.user?.id ?? null, label: ctx.supplier.displayName } };
}

function done(path: string) {
  revalidatePath(path);
  redirect(path);
}

export async function returnCheckAction(f: FormData) {
  const { id, supplierId, back } = await ctxOf(f);
  const condition = s(f, "condition") === "DAMAGED" ? "DAMAGED" : "OK";
  const r = await markReturnReceivedByPartner(db, id, supplierId, condition, s(f, "note", 300));
  if (r === "note") redirect(back("?error=note"));
  if (r !== "ok") redirect(back("?error=state"));
  await sendReturnMail(id, "received");
  done(back("?ok=returnchecked"));
}

export async function returnDecideAction(f: FormData) {
  const { id, supplierId, back } = await ctxOf(f);
  const refused = s(f, "decision") === "REFUSED";
  const rr = refused ? await findActiveReason(db, "RETURN", s(f, "reasonId", 60)) : null;
  const r = await partnerDecideReturn(db, id, supplierId, refused ? "REFUSED" : "ACCEPTED", s(f, "note", 500), new Date(), rr?.id ?? null);
  if (r === "note") redirect(back("?error=reason"));
  if (r !== "ok") redirect(back("?error=state"));
  const decision = s(f, "decision") === "REFUSED" ? "REFUSED" : "ACCEPTED";
  await sendReturnMail(id, decision === "REFUSED" ? "decided_refused" : "decided_accepted");
  done(back("?ok=returndecided"));
}

export async function acceptOrderAction(f: FormData) {
  const { id, supplierId, back } = await ctxOf(f);
  const sub = await acceptSub(db, id, supplierId);
  if (!sub) redirect(back("?error=state"));
  await notifySubOrder("ACCEPTED", id);
  done(back("?ok=accepted"));
}

export async function refuseOrderAction(f: FormData) {
  const { id, supplierId, back, actor } = await ctxOf(f);
  const rr = await findActiveReason(db, "ORDER", s(f, "reasonId", 60));
  if (!rr) redirect(back("?error=reason"));
  const note = s(f, "note", 500);
  const sub = await refuseSub(db, id, supplierId, rr.fr, actor, rr.id, note || null);
  if (!sub) redirect(back("?error=state"));
  await settleSubRefund(id);
  await notifySubOrder("REFUSED", id);
  done(back("?ok=refused"));
}

export async function prepareOrderAction(f: FormData) {
  const { id, supplierId, back } = await ctxOf(f);
  if (!(await prepareSub(db, id, supplierId))) redirect(back("?error=state"));
  await notifySubOrder("PREPARING", id);
  done(back("?ok=preparing"));
}

export async function shipOrderAction(f: FormData) {
  const { id, supplierId, back, actor } = await ctxOf(f);
  const rawCarrier = s(f, "carrier", 80);
  const carrier = rawCarrier === "__other" ? s(f, "carrierOther", 80) : rawCarrier;
  const tracking = cleanTrackingNumber(s(f, "tracking", 80));
  if (!carrier || !tracking) redirect(back("?error=tracking"));
  let sub = null;
  try {
    sub = await shipSub(db, id, supplierId, carrier, tracking, actor);
  } catch {
    redirect(back("?error=stock"));
  }
  if (!sub) redirect(back("?error=state"));
  await notifySubOrder("SHIPPED", id);
  done(back("?ok=shipped"));
}

export async function deliverOrderAction(f: FormData) {
  const { id, supplierId, back } = await ctxOf(f);
  if (!(await deliverSub(db, id, supplierId))) redirect(back("?error=state"));
  await notifySubOrder("DELIVERED", id);
  done(back("?ok=delivered"));
}
