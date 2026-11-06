import { buttonVariants } from "@/components/ui/button";
import { inputCls } from "@/components/fournisseur/parts";
import { COUNTRIES, tr } from "@/lib/supplier-mock";
import type { Locale } from "@/lib/i18n";

export const metadata = { title: "Profil fournisseur", robots: { index: false } };

export default async function ProfilePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Profil", "Profile")}</h1>
      <form className="max-w-2xl space-y-4">
        <div className="flex items-center gap-4">
          <div aria-hidden="true" className="flex size-20 items-center justify-center rounded-full bg-primary font-heading text-3xl text-accent">K</div>
          <label className="block text-sm font-medium">
            {tr(locale, "Photo de profil", "Profile photo")}
            <input type="file" accept="image/*" className={inputCls} />
          </label>
        </div>
        <label className="block text-sm font-medium">
          {tr(locale, "Nom d'artiste", "Artist name")}
          <input defaultValue="KeNoF" className={inputCls} />
        </label>
        <label className="block text-sm font-medium">
          {tr(locale, "Pays", "Country")}
          <select defaultValue="Cameroun" className={inputCls}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="block text-sm font-medium">
          {tr(locale, "Biographie", "Biography")}
          <textarea rows={5} defaultValue={tr(locale, "Texte de démonstration : artiste plasticien, entre mémoire et modernité.", "Demo text: visual artist between memory and modernity.")} className={inputCls} />
        </label>
        <label className="block text-sm font-medium">
          {tr(locale, "Vidéo de présentation (MP4)", "Intro video (MP4)")}
          <input type="file" accept="video/mp4" className={inputCls} />
        </label>
        <button type="button" className={buttonVariants({ size: "lg", className: "min-h-11" })}>{tr(locale, "Enregistrer (maquette)", "Save (mockup)")}</button>
      </form>
    </>
  );
}
