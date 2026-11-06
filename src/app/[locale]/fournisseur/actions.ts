"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdminEmail, VIEW_AS_COOKIE, getPortalContext } from "@/lib/supplier";
import { emailAdminNewApplication, emailApplicantReceived } from "@/lib/supplier-email";

const s = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const loc = (f: FormData) => (s(f, "locale") === "en" ? "en" : "fr");

export async function submitApplication(formData: FormData) {
  const locale = loc(formData);
  const base = `/${locale}/fournisseur/candidature`;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?next=${encodeURIComponent(base)}`);
  if (s(formData, "website")) redirect(`${base}?sent=1`); // honeypot : on fait semblant
  const data = {
    name: s(formData, "name", 120),
    country: s(formData, "country", 80),
    craftType: s(formData, "craftType", 80),
    portfolioUrl: s(formData, "portfolioUrl", 300),
    about: s(formData, "about", 3000),
  };
  const userId = session.user.id;
  const urlOk = !data.portfolioUrl || /^https?:\/\/\S+\.\S+/.test(data.portfolioUrl);
  if (!data.name || !data.country || !data.craftType || data.about.length < 20 || !urlOk) redirect(`${base}?error=invalid`);
  if (await db.supplier.findUnique({ where: { userId } })) redirect(`/${locale}/fournisseur/tableau-de-bord`);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect(`/${locale}/login`);
  const open = await db.supplierApplication.findFirst({ where: { userId, status: { in: ["PENDING", "NEEDS_INFO"] } }, orderBy: { createdAt: "desc" } });
  if (open?.status === "PENDING") redirect(`${base}?error=pending`);
  const pending = await db.applicationFile.count({ where: { userId, applicationId: null } });
  const attached = open ? await db.applicationFile.count({ where: { applicationId: open.id } }) : 0;
  if (!data.portfolioUrl && pending + attached === 0) redirect(`${base}?error=proof`);
  if (!open && (await db.supplierApplication.count({ where: { userId, createdAt: { gt: new Date(Date.now() - 24 * 3600_000) } } })) >= 3) redirect(`${base}?error=rate`);
  const saved = open
    ? await db.supplierApplication.update({ where: { id: open.id }, data: { ...data, status: "PENDING", locale } })
    : await db.supplierApplication.create({ data: { ...data, userId, email: user.email, locale } });
  await db.applicationFile.updateMany({ where: { userId, applicationId: null }, data: { applicationId: saved.id } });
  const mail = { ...data, email: user.email, locale };
  await emailAdminNewApplication(mail);
  await emailApplicantReceived(mail);
  redirect(`${base}?sent=1`);
}

export async function updateSupplierProfile(formData: FormData) {
  const locale = loc(formData);
  const ctx = await getPortalContext();
  if (!ctx || ctx.viewingAs) redirect(`/${locale}/fournisseur/profil?error=readonly`);
  await db.supplier.update({
    where: { id: ctx.supplier.id },
    data: {
      displayName: s(formData, "displayName", 120) || ctx.supplier.displayName,
      country: s(formData, "country", 80) || ctx.supplier.country,
      bio: locale === "fr" ? s(formData, "bio", 4000) : ctx.supplier.bio,
      bioEn: locale === "en" ? s(formData, "bio", 4000) : ctx.supplier.bioEn,
      videoUrl: /^https?:\/\//.test(s(formData, "videoUrl", 300)) ? s(formData, "videoUrl", 300) : null,
      ...(formData.has("signatureUrl") ? { signatureFileId: await ownedMediaId(s(formData, "signatureUrl", 400), ctx.supplier.userId) } : {}),
    },
  });
  redirect(`/${locale}/fournisseur/profil?saved=1`);
}

// Signature enregistrée une seule fois : le fichier doit appartenir au compte (tableau JSON d'une URL /api/media/<id>).
async function ownedMediaId(raw: string, userId: string | null) {
  let url = "";
  try {
    const arr = JSON.parse(raw);
    url = Array.isArray(arr) ? String(arr[0] ?? "") : "";
  } catch {}
  const id = /^\/api\/media\/([\w-]+)$/.exec(url)?.[1];
  if (!id || !userId) return null;
  const row = await db.mediaFile.findUnique({ where: { id }, select: { ownerUserId: true } });
  return row?.ownerUserId === userId ? id : null;
}

// Admin seulement : ouvre l'espace d'un partenaire de démonstration (jamais d'un vrai partenaire).
export async function setViewAs(formData: FormData) {
  const locale = loc(formData);
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect(`/${locale}`);
  const id = s(formData, "supplierId", 60);
  const jar = await cookies();
  if (!id) {
    jar.delete(VIEW_AS_COOKIE);
    redirect(`/${locale}/account`);
  }
  const demo = await db.supplier.findFirst({ where: { id, isDemo: true, status: "ACTIVE" } });
  if (!demo) redirect(`/${locale}/admin`);
  jar.set(VIEW_AS_COOKIE, demo.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 8 * 3600 });
  redirect(`/${locale}/fournisseur/tableau-de-bord`);
}
