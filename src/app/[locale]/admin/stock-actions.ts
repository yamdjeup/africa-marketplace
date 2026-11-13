"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { adminAdjustStock } from "@/lib/admin-stock-adjust";
import { notifyLowStock, snapshotAvail } from "@/lib/stock-alerts";
import { isAdminEmail } from "@/lib/supplier";

const s = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

export async function adminAdjustStockAction(formData: FormData) {
  const locale = s(formData, "locale", 2) === "en" ? "en" : "fr";
  const session = await auth();
  if (!session?.user?.id || !session.user.email || !isAdminEmail(session.user.email)) redirect("/");
  const slug = s(formData, "slug", 120);
  const back = (q: string) => `/${locale}/admin/stock/ajuster/${slug}?${q}`;
  const type = s(formData, "type", 8) === "ENTRY" ? "ENTRY" : "ADJUST";
  const n = Number(s(formData, "delta", 12).replace(",", "."));
  const before = await snapshotAvail([slug]);
  const r = await adminAdjustStock({ slug, variant: s(formData, "variant", 60) || null, type, delta: Math.trunc(n), reason: s(formData, "reason", 200), admin: { id: session.user.id, email: session.user.email } });
  if (r === "notfound") redirect(`/${locale}/admin/stock`);
  if (r !== "ok") redirect(back(`error=${r}`));
  if (n < 0) await notifyLowStock(before).catch(() => undefined);
  revalidatePath("/[locale]/admin/stock", "page");
  redirect(back("saved=1"));
}
