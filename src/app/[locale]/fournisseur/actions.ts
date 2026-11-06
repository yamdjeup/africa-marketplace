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
  if (!data.name || !data.country || !data.craftType || data.about.length < 20 || !/^https?:\/\/\S+\.\S+/.test(data.portfolioUrl)) redirect(`${base}?error=invalid`);
  const userId = session.user.id;
  if (await db.supplier.findUnique({ where: { userId } })) redirect(`/${locale}/fournisseur/tableau-de-bord`);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect(`/${locale}/login`);
  const open = await db.supplierApplication.findFirst({ where: { userId, status: { in: ["PENDING", "NEEDS_INFO"] } }, orderBy: { createdAt: "desc" } });
  if (open?.status === "PENDING") redirect(`${base}?error=pending`);
  if (!open && (await db.supplierApplication.count({ where: { userId, createdAt: { gt: new Date(Date.now() - 24 * 3600_000) } } })) >= 3) redirect(`${base}?error=rate`);
  if (open) {
    await db.supplierApplication.update({ where: { id: open.id }, data: { ...data, status: "PENDING", locale } });
  } else {
    await db.supplierApplication.create({ data: { ...data, userId, email: user.email, locale } });
  }
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
    },
  });
  redirect(`/${locale}/fournisseur/profil?saved=1`);
}

// Admin seulement : ouvre l'espace d'un fournisseur de démonstration (jamais d'un vrai fournisseur).
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
