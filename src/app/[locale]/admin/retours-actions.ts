"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { refundSubOrder } from "@/lib/refund";
import { sendPartnerReturnMail, sendReturnMail } from "@/lib/return-email";
import { flushRestockSafe } from "@/lib/restock-flush";
import { decideReturn, markReturnReceived, markReturnRefundedManually, parseStockChoice, refundReturn } from "@/lib/returns";
import { isAdminEmail } from "@/lib/supplier";

const path = "/fr/admin/retours";

async function admin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
}

async function notifyCustomer(returnId: string, kind: "accepted" | "received" | "refused" | "refunded", note?: string) {
  const ret = await db.returnRequest.findUnique({ where: { id: returnId }, select: { subOrderId: true } });
  if (ret) {
    await sendReturnMail(ret.subOrderId, kind, note);
    await sendPartnerReturnMail(ret.subOrderId, kind, note);
  }
}

export async function markReceivedAction(f: FormData) {
  await admin();
  const id = String(f.get("id") ?? "");
  if (!(await markReturnReceived(db, id))) redirect(`${path}?error=state`);
  await notifyCustomer(id, "received");
  revalidatePath(path);
  redirect(`${path}?ok=received`);
}

export async function decideReturnAction(f: FormData) {
  await admin();
  const id = String(f.get("id") ?? "");
  const decision = f.get("decision") === "ACCEPTED" ? "ACCEPTED" : "REFUSED";
  const note = String(f.get("note") ?? "");
  const done = await decideReturn(db, id, decision, note);
  if (!done) redirect(`${path}?error=state`);
  await notifyCustomer(id, decision === "ACCEPTED" ? "accepted" : "refused", note);
  revalidatePath(path);
  redirect(`${path}?ok=${decision === "ACCEPTED" ? "accepted" : "refused"}`);
}

export async function refundReturnAction(f: FormData) {
  await admin();
  const id = String(f.get("id") ?? "");
  const manual = f.get("manual") === "1";
  const restock = parseStockChoice(f);
  if (restock === null) redirect(`${path}?error=stock`);
  const r = manual ? await markReturnRefundedManually(db, id, new Date(), restock) : await refundReturn(db, id, refundSubOrder, new Date(), restock);
  if (!r) redirect(`${path}?error=state`);
  if (!r.done) redirect(`${path}?error=refund`);
  if (restock === true) await flushRestockSafe();
  await notifyCustomer(id, "refunded");
  revalidatePath(path);
  redirect(`${path}?ok=refunded`);
}
