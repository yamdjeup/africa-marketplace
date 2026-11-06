import { buttonVariants } from "@/components/ui/button";
import { inputCls } from "@/components/fournisseur/parts";
import { getPortalContext } from "@/lib/supplier";
import { COUNTRIES, tr } from "@/lib/tr";
import type { Locale } from "@/lib/i18n";
import { updateSupplierProfile } from "../../actions";

export const metadata = { title: "Profil partenaire", robots: { index: false } };

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function ProfilePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const s = ctx.supplier;
  const readOnly = ctx.viewingAs;
  const countries = COUNTRIES.includes(s.country) ? COUNTRIES : [s.country, ...COUNTRIES];
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Profil", "Profile")}</h1>
      {sp.saved && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, "Profil enregistré.", "Profile saved.")}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{tr(locale, "Modification impossible en vue admin.", "Editing is not possible in admin view.")}</p>}
      <form action={updateSupplierProfile} className="max-w-2xl space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <fieldset disabled={readOnly} className="space-y-4">
          <label className="block text-sm font-medium">{tr(locale, "Nom d'artiste / d'atelier", "Artist / studio name")}
            <input name="displayName" required defaultValue={s.displayName} className={inputCls} /></label>
          <label className="block text-sm font-medium">{tr(locale, "Pays", "Country")}
            <select name="country" defaultValue={s.country} className={inputCls}>{countries.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="block text-sm font-medium">{tr(locale, "Biographie", "Biography")}
            <textarea name="bio" rows={6} defaultValue={locale === "en" ? s.bioEn : s.bio} className={inputCls} /></label>
          <label className="block text-sm font-medium">{tr(locale, "Vidéo de présentation (lien https)", "Intro video (https link)")}
            <input name="videoUrl" type="url" defaultValue={s.videoUrl ?? ""} placeholder="https://" className={inputCls} /></label>
          <button type="submit" className={buttonVariants({ size: "lg", className: "min-h-11" })}>{tr(locale, "Enregistrer", "Save")}</button>
        </fieldset>
      </form>
    </>
  );
}
