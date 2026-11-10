"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notifySubOrder } from "@/lib/order-notify";
import { settleSubRefund } from "@/lib/refund";
import { cancelSub } from "@/lib/suborders";
import { isAdminEmail } from "@/lib/supplier";

// Annulation admin (arbitrage) : libère le stock réservé et prévient le client.
export async function adminCancelSubOrder(formData: FormData) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  const path = "/fr/admin/commandes";
  if (reason.length < 3) redirect(`${path}?error=reason`);
  const sub = await cancelSub(db, id, reason, { id: session?.user?.id ?? null, label: `admin ${session?.user?.email}` });
  if (!sub) redirect(`${path}?error=state`);
  await settleSubRefund(id);
  await notifySubOrder("CANCELLED", id);
  revalidatePath(path);
  redirect(`${path}?ok=cancelled`);
}
