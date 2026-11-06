"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/supplier";
import { emailApplicantDecision, emailPartnerProductDecision } from "@/lib/supplier-email";

export async function decideApplication(formData: FormData) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  if (!["ACCEPTED", "REFUSED", "NEEDS_INFO"].includes(decision)) return;
  const app = await db.supplierApplication.findUnique({ where: { id } });
  if (!app || app.status === "ACCEPTED") return;
  const status = decision as "ACCEPTED" | "REFUSED" | "NEEDS_INFO";
  await db.$transaction(async (tx) => {
    await tx.supplierApplication.update({ where: { id }, data: { status, adminNote: note, decidedAt: new Date() } });
    if (status === "ACCEPTED") {
      const existing = await tx.supplier.findUnique({ where: { userId: app.userId } });
      const data = { displayName: app.name, country: app.country, craftType: app.craftType, bio: app.about, status: "ACTIVE" };
      if (existing) await tx.supplier.update({ where: { id: existing.id }, data });
      else await tx.supplier.create({ data: { ...data, userId: app.userId } });
    }
  });
  await emailApplicantDecision(app, status, note);
  revalidatePath("/[locale]/admin/candidatures", "page");
}

export async function moderateProduct(formData: FormData) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
  const slug = String(formData.get("slug") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  const p = await db.product.findUnique({ where: { slug } });
  const sup = p?.supplierId ? await db.supplier.findUnique({ where: { id: p.supplierId }, include: { user: { select: { email: true } } } }) : null;
  if (!p || p.status !== "SUBMITTED" || !sup) return;
  if (decision === "REJECTED" && !reason) return;
  const ok = decision === "PUBLISHED";
  if (!ok && decision !== "REJECTED") return;
  await db.product.update({ where: { slug }, data: { status: decision, rejectReason: ok ? null : reason } });
  if (sup.user?.email) await emailPartnerProductDecision({ email: sup.user.email, name: sup.displayName, locale: "fr" }, p.name, ok, reason);
  revalidatePath("/[locale]/admin/oeuvres", "page");
}
