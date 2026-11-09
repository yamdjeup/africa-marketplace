"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notifySubOrder } from "@/lib/order-notify";
import { acceptSub, deliverSub, prepareSub, refuseSub, shipSub } from "@/lib/suborders";
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

export async function acceptOrderAction(f: FormData) {
  const { id, supplierId, back } = await ctxOf(f);
  const sub = await acceptSub(db, id, supplierId);
  if (!sub) redirect(back("?error=state"));
  await notifySubOrder("ACCEPTED", id);
  done(back("?ok=accepted"));
}

export async function refuseOrderAction(f: FormData) {
  const { id, supplierId, back, actor } = await ctxOf(f);
  const reason = s(f, "reason");
  if (reason.length < 3) redirect(back("?error=reason"));
  const sub = await refuseSub(db, id, supplierId, reason, actor);
  if (!sub) redirect(back("?error=state"));
  await notifySubOrder("REFUSED", id);
  done(back("?ok=refused"));
}

export async function prepareOrderAction(f: FormData) {
  const { id, supplierId, back } = await ctxOf(f);
  if (!(await prepareSub(db, id, supplierId))) redirect(back("?error=state"));
  done(back("?ok=preparing"));
}

export async function shipOrderAction(f: FormData) {
  const { id, supplierId, back, actor } = await ctxOf(f);
  const rawCarrier = s(f, "carrier", 80);
  const carrier = rawCarrier === "__other" ? s(f, "carrierOther", 80) : rawCarrier;
  const tracking = s(f, "tracking", 80);
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
