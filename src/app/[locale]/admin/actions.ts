"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/supplier";
import { emailApplicantDecision, emailPartnerProductDecision, emailPartnerStatus } from "@/lib/supplier-email";

// Suspendre / réactiver / révoquer un partenaire. Œuvres publiées : PUBLISHED <-> HELD (masquées du catalogue).
export async function changePartnerStatus(formData: FormData) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  const anonymize = formData.get("anonymize") === "on";
  const back = (q: string) => redirect(`/fr/admin/fournisseurs?${q}`);
  if (!["SUSPEND", "REACTIVATE", "REVOKE"].includes(action)) return back("error=action");
  if (action !== "REACTIVATE" && !reason) return back("error=reason");
  if (action === "REVOKE" && formData.get("confirm") !== "on") return back("error=confirm");
  const s = await db.supplier.findUnique({ where: { id }, include: { user: { select: { email: true } } } });
  if (!s || s.isDemo || s.status === "REVOKED") return back("error=invalid");
  if (action === "SUSPEND" && s.status !== "ACTIVE") return back("error=invalid");
  if (action === "REACTIVATE" && s.status !== "SUSPENDED") return back("error=invalid");
  if (action === "REVOKE") {
    // Commandes en cours : du stock encore réservé signifie une commande non clôturée.
    const open = (await db.product.count({ where: { supplierId: id, reserved: { gt: 0 } } })) + (await db.subOrder.count({ where: { supplierId: id, status: { in: ["PENDING", "ACCEPTED", "PREPARING", "SHIPPED"] } } }));
    if (open > 0) return back("error=open");
  }
  const status = action === "SUSPEND" ? "SUSPENDED" : action === "REACTIVATE" ? "ACTIVE" : "REVOKED";
  await db.$transaction(async (tx) => {
    await tx.supplier.update({ where: { id }, data: { status } });
    if (action === "REACTIVATE") await tx.product.updateMany({ where: { supplierId: id, status: "HELD" }, data: { status: "PUBLISHED" } });
    else await tx.product.updateMany({ where: { supplierId: id, status: "PUBLISHED" }, data: { status: "HELD" } });
    await tx.partnerAudit.create({ data: { supplierId: id, action, reason, actorEmail: session?.user?.email ?? "" } });
    if (action === "REVOKE" && anonymize) {
      if (s.signatureFileId) await tx.mediaFile.deleteMany({ where: { id: s.signatureFileId } });
      await tx.supplier.update({ where: { id }, data: { displayName: "Partenaire retiré", bio: "", bioEn: "", videoUrl: null, signatureFileId: null } });
    }
  });
  if (s.user?.email) await emailPartnerStatus({ email: s.user.email, name: s.displayName, locale: "fr" }, action as "SUSPEND" | "REACTIVATE" | "REVOKE", reason);
  revalidatePath("/[locale]/admin/fournisseurs", "page");
  back(`done=${action}`);
}

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
