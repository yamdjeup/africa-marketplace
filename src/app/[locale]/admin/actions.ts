"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/supplier";
import { emailApplicantDecision, emailPartnerProductDecision, emailPartnerStatus } from "@/lib/supplier-email";
import { partnerNameTaken } from "@/lib/partner-name";
import { changeLog, changedFields, validateContact } from "@/lib/partner-profile";

// Suspendre / réactiver / révoquer un partenaire. Œuvres publiées : PUBLISHED <-> HELD (masquées du catalogue).
export async function changePartnerStatus(formData: FormData) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  const anonymize = formData.get("anonymize") === "on";
  const locale = formData.get("locale") === "en" ? "en" : "fr";
  const back = (q: string) => redirect(`/${locale}/admin/fournisseurs?${q}`);
  if (!["SUSPEND", "REACTIVATE", "REVOKE"].includes(action)) return back("error=action");
  if (action !== "REACTIVATE" && !reason) return back("error=reason");
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
  if (status === "ACCEPTED") {
    const mine = await db.supplier.findUnique({ where: { userId: app.userId }, select: { id: true } });
    if (await partnerNameTaken(app.name, mine?.id)) redirect("/fr/admin/candidatures?error=name");
  }
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
  if (!p || !sup || !(p.status === "SUBMITTED" || (p.status === "PUBLISHED" && decision === "REJECTED") || (p.status === "REJECTED" && decision === "PUBLISHED"))) return;
  if (decision === "REJECTED" && !reason) return;
  const ok = decision === "PUBLISHED";
  if (!ok && decision !== "REJECTED") return;
  await db.product.update({ where: { slug }, data: { status: decision, rejectReason: ok ? null : reason, decidedAt: new Date() } });
  if (sup.user?.email) await emailPartnerProductDecision({ email: sup.user.email, name: sup.displayName, locale: "fr" }, p.name, ok, reason, p.status === "PUBLISHED");
  revalidatePath("/[locale]/admin/oeuvres", "page");
}

// Publier / refuser une ou plusieurs œuvres (cases cochées ou bouton de ligne), motif commun pour les refus.
export async function bulkModerateProducts(formData: FormData) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
  const decisionIn = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  const back = String(formData.get("back") ?? "");
  const only = String(formData.get("only") ?? "");
  const [onlyDecision, ...onlyRest] = only.split(":");
  const onlySlug = onlyRest.join(":");
  const decision = only ? onlyDecision : decisionIn;
  const slugs = (only ? [onlySlug] : formData.getAll("slug").map(String)).slice(0, 200);
  const ok = decision === "PUBLISHED";
  const dest = back.startsWith("/") && !back.startsWith("//") ? back : "/fr/admin/oeuvres";
  if ((!ok && decision !== "REJECTED") || slugs.length === 0) redirect(dest);
  if (!ok && !reason) redirect(`${dest}${dest.includes("?") ? "&" : "?"}error=reason`);
  let done = 0;
  for (const slug of slugs) {
    const p = await db.product.findUnique({ where: { slug } });
    const sup = p?.supplierId ? await db.supplier.findUnique({ where: { id: p.supplierId }, include: { user: { select: { email: true } } } }) : null;
    if (!p || !sup || !(p.status === "SUBMITTED" || (p.status === "PUBLISHED" && !ok) || (p.status === "REJECTED" && ok))) continue;
    await db.product.update({ where: { slug }, data: { status: decision, rejectReason: ok ? null : reason, decidedAt: new Date() } });
    if (sup.user?.email) await emailPartnerProductDecision({ email: sup.user.email, name: sup.displayName, locale: "fr" }, p.name, ok, reason, p.status === "PUBLISHED");
    done++;
  }
  revalidatePath("/[locale]/admin/oeuvres", "page");
  redirect(`${dest}${dest.includes("?") ? "&" : "?"}done=${done}&dec=${ok ? "P" : "R"}`);
}

// L'admin modifie tout le profil d'un partenaire ; chaque modification est journalisée (noms des champs).
export async function adminUpdatePartnerProfile(formData: FormData) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
  const f = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);
  const id = f("id", 60);
  const locale = formData.get("locale") === "en" ? "en" : "fr";
  const back = (q: string) => redirect(`/${locale}/admin/fournisseurs/${id}/profil?${q}`);
  const s = await db.supplier.findUnique({ where: { id } });
  if (!s) redirect(`/${locale}/admin/fournisseurs`);
  const next = {
    displayName: f("displayName", 120) || s.displayName,
    country: f("country", 80) || s.country,
    craftType: f("craftType", 80) || s.craftType,
    bio: f("bio", 4000),
    bioEn: f("bioEn", 4000),
    videoUrl: /^https?:\/\//.test(f("videoUrl", 300)) ? f("videoUrl", 300) : null,
    contactEmail: f("contactEmail", 200),
    phone: f("phone", 30),
    address: f("address", 400),
  };
  const invalid = validateContact(next);
  if (invalid) return back(`error=${invalid}`);
  if (await partnerNameTaken(next.displayName, id)) return back("error=name");
  const changed = changedFields<Record<string, unknown>>({ ...s }, next);
  await db.$transaction(async (tx) => {
    await tx.supplier.update({ where: { id }, data: { ...next, contactEmail: next.contactEmail || null, phone: next.phone || null, address: next.address || null } });
    if (changed.length) await tx.partnerAudit.create({ data: { supplierId: id, action: "PROFILE_EDIT", reason: changeLog<Record<string, unknown>>({ ...s }, next), actorEmail: session?.user?.email ?? "" } });
  });
  revalidatePath("/[locale]/admin/fournisseurs", "page");
  back("saved=1");
}
