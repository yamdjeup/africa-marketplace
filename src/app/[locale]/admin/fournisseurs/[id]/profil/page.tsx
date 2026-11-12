import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { inputCls } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { CONTACT_ERRORS, type ContactError } from "@/lib/partner-profile";
import { tr } from "@/lib/tr";
import { adminUpdatePartnerProfile } from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profil partenaire (admin)", robots: { index: false } };

type Props = { params: Promise<{ locale: Locale; id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AdminPartnerProfilePage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const s = await db.supplier.findUnique({ where: { id } });
  if (!s || s.isDemo) notFound();
  const err = sp.error === "name" ? tr(locale, "Ce nom est déjà utilisé par un partenaire.", "This name is already used by a partner.") : sp.error && sp.error in CONTACT_ERRORS ? tr(locale, ...CONTACT_ERRORS[sp.error as ContactError]) : null;
  return (
    <div className="space-y-4">
      <Link href={`/${locale}/admin/fournisseurs`} className="text-sm underline">← {tr(locale, "Partenaires", "Partners")}</Link>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Profil de", "Profile of")} {s.displayName}</h1>
      {sp.saved && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, "Profil enregistré.", "Profile saved.")}</p>}
      {err && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{err}</p>}
      <form action={adminUpdatePartnerProfile} className="max-w-2xl space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={s.id} />
        <label className="block text-sm font-medium">{tr(locale, "Nom affiché", "Display name")}
          <input name="displayName" required maxLength={120} defaultValue={s.displayName} className={inputCls} /></label>
        <label className="block text-sm font-medium">{tr(locale, "Pays", "Country")}
          <input name="country" maxLength={80} defaultValue={s.country} className={inputCls} /></label>
        <label className="block text-sm font-medium">{tr(locale, "Savoir-faire", "Craft")}
          <input name="craftType" maxLength={80} defaultValue={s.craftType} className={inputCls} /></label>
        <label className="block text-sm font-medium">{tr(locale, "E-mail de contact", "Contact email")}
          <input name="contactEmail" type="email" maxLength={200} defaultValue={s.contactEmail ?? ""} className={inputCls} /></label>
        <label className="block text-sm font-medium">{tr(locale, "Téléphone", "Phone")}
          <input name="phone" type="tel" maxLength={30} defaultValue={s.phone ?? ""} className={inputCls} /></label>
        <label className="block text-sm font-medium">{tr(locale, "Adresse", "Address")}
          <textarea name="address" rows={3} maxLength={300} defaultValue={s.address ?? ""} className={inputCls} /></label>
        <label className="block text-sm font-medium">{tr(locale, "Biographie (FR)", "Biography (FR)")}
          <textarea name="bio" rows={4} maxLength={4000} defaultValue={s.bio} className={inputCls} /></label>
        <label className="block text-sm font-medium">{tr(locale, "Biographie (EN)", "Biography (EN)")}
          <textarea name="bioEn" rows={4} maxLength={4000} defaultValue={s.bioEn} className={inputCls} /></label>
        <label className="block text-sm font-medium">{tr(locale, "Lien vidéo", "Video link")}
          <input name="videoUrl" type="url" maxLength={300} defaultValue={s.videoUrl ?? ""} className={inputCls} /></label>
        <button className={buttonVariants({ className: "min-h-11" })}>{tr(locale, "Enregistrer", "Save")}</button>
      </form>
    </div>
  );
}
