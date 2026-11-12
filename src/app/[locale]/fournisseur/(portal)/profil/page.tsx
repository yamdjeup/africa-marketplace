import { buttonVariants } from "@/components/ui/button";
import { PhotoUploader } from "@/components/fournisseur/media-fields";
import { inputCls } from "@/components/fournisseur/parts";
import { getPortalContext } from "@/lib/supplier";
import { db } from "@/lib/db";
import { COUNTRIES, tr } from "@/lib/tr";
import type { Locale } from "@/lib/i18n";
import { CONTACT_ERRORS, type ContactError } from "@/lib/partner-profile";
import { updateSupplierProfile } from "../../actions";

export const metadata = { title: "Profil partenaire", robots: { index: false } };

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function ProfilePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const s = ctx.supplier;
  const avatar = s.creatorSlug ? (await db.creator.findUnique({ where: { slug: s.creatorSlug }, select: { image: true } }))?.image : "";
  const readOnly = ctx.viewingAs;
  const countries = COUNTRIES.includes(s.country) ? COUNTRIES : [s.country, ...COUNTRIES];
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Profil", "Profile")}</h1>
      {sp.saved && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, "Profil enregistré.", "Profile saved.")}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{sp.error === "name" ? tr(locale, "Ce nom est déjà utilisé par un partenaire.", "This name is already used by a partner.") : sp.error in CONTACT_ERRORS ? tr(locale, ...CONTACT_ERRORS[sp.error as ContactError]) : tr(locale, "Modification impossible en vue admin.", "Editing is not possible in admin view.")}</p>}
      <form action={updateSupplierProfile} className="max-w-2xl space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <fieldset disabled={readOnly} className="space-y-4">
          <label className="block text-sm font-medium">{tr(locale, "Nom d'artiste / d'atelier", "Artist / studio name")}
            <input name="displayName" required defaultValue={s.displayName} className={inputCls} /></label>
          <label className="block text-sm font-medium">{tr(locale, "Pays", "Country")}
            <select name="country" defaultValue={s.country} className={inputCls}>{countries.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="block text-sm font-medium">{tr(locale, "E-mail de contact", "Contact email")}
            <input name="contactEmail" type="email" maxLength={200} defaultValue={s.contactEmail ?? ""} className={inputCls} /></label>
          <label className="block text-sm font-medium">{tr(locale, "Téléphone", "Phone")}
            <input name="phone" type="tel" maxLength={30} defaultValue={s.phone ?? ""} placeholder="+33 6 12 34 56 78" className={inputCls} /></label>
          <label className="block text-sm font-medium">{tr(locale, "Adresse", "Address")}
            <textarea name="address" rows={3} maxLength={300} defaultValue={s.address ?? ""} className={inputCls} /></label>
          <label className="block text-sm font-medium">{tr(locale, "Biographie", "Biography")}
            <textarea name="bio" rows={6} defaultValue={locale === "en" ? s.bioEn : s.bio} className={inputCls} /></label>
          <label className="block text-sm font-medium">{tr(locale, "Vidéo de présentation (lien https)", "Intro video (https link)")}
            <input name="videoUrl" type="url" defaultValue={s.videoUrl ?? ""} placeholder="https://" className={inputCls} /></label>
          {!readOnly && (
            <PhotoUploader
              name="avatarUrl"
              strictSize
              max={1}
              fr={locale !== "en"}
              initial={avatar ? [avatar] : []}
              label={tr(locale, "Photo de profil", "Profile photo")}
              hint={tr(locale, "Affichée sur votre page boutique. À défaut, vos initiales sont utilisées.", "Shown on your shop page. Otherwise your initials are used.")}
            />
          )}
          {!readOnly && (
            <PhotoUploader
              name="signatureUrl"
              kind="signature"
              max={1}
              fr={locale !== "en"}
              initial={s.signatureFileId ? [`/api/media/${s.signatureFileId}`] : []}
              label={tr(locale, "Ma signature (enregistrée une seule fois, pour les œuvres d'art)", "My signature (saved once, for artworks)")}
              hint={tr(locale, "Facultatif. Dessinez-la ou téléversez une image.", "Optional. Draw it or upload an image.")}
              extra
            />
          )}
          <button type="submit" className={buttonVariants({ size: "lg", className: "min-h-11" })}>{tr(locale, "Enregistrer", "Save")}</button>
        </fieldset>
      </form>
    </>
  );
}
