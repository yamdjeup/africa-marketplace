import { db } from "@/lib/db";
import { COUNTRY_LIST } from "@/lib/countries";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";
import { saveCreatorAction } from "./actions";

export const metadata = { title: "Profils partenaires", robots: { index: false } };

const field = "w-full rounded-md border bg-background px-3 py-2 text-sm";
const btn = "inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium";
const CATS: [string, string, string][] = [
  ["peinture", "Peinture", "Painting"],
  ["sculpture", "Sculpture", "Sculpture"],
  ["couture-mode", "Couture et mode", "Fashion and tailoring"],
  ["bijoux", "Accessoires", "Accessories"],
  ["textile-decoration", "Textile et décoration", "Textiles and home decor"],
  ["photographie", "Photographie", "Photography"],
];

export default async function AdminCreators({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ ok?: string; error?: string; edit?: string; q?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const rows = await db.creator.findMany({
    where: { ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
    orderBy: { name: "asc" },
    take: 60,
    select: { slug: true, name: true, published: true, simuIllustration: true },
  });
  const cur = sp.edit ? await db.creator.findUnique({ where: { slug: sp.edit } }) : null;
  const selCountries = new Set((cur?.countryEn ?? "").split(", ").filter(Boolean));
  const selCats = new Set((cur?.categorySlugs ?? "").split(",").filter(Boolean));
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-primary">{tr(locale, "Profils partenaires", "Partner profiles")}</h2>
      <p className="text-sm text-muted-foreground">{tr(locale, "Créez ou modifiez un profil sans compte connectable. Site, e-mail et Instagram restent privés (jamais affichés).", "Create or edit a profile without a login. Website, e-mail and Instagram stay private (never displayed).")}</p>
      {sp.ok && <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm">{tr(locale, "Enregistré.", "Saved.")}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">{tr(locale, "Nom obligatoire (2 caractères minimum).", "Name required (2 characters minimum).")}</p>}
      <form action={saveCreatorAction} key={cur?.slug ?? "new"} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
        <h3 className="font-semibold sm:col-span-2">{cur ? tr(locale, `Modifier : ${cur.name}`, `Edit: ${cur.name}`) : tr(locale, "Nouveau profil", "New profile")}</h3>
        <label className="text-sm">{tr(locale, "Nom", "Name")}<input name="name" required defaultValue={cur?.name} className={field} /></label>
        <label className="text-sm">Slug<input name="slug" defaultValue={cur?.slug} readOnly={!!cur} placeholder={tr(locale, "auto depuis le nom", "auto from name")} className={field} /></label>
        <fieldset className="text-sm sm:col-span-2"><legend>{tr(locale, "Pays (plusieurs possibles)", "Countries (several allowed)")}</legend>
          <div className="mt-1 grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-4">
            {COUNTRY_LIST.map((c) => <label key={c.key} className="flex items-center gap-2"><input type="checkbox" name="countries" value={c.en} defaultChecked={selCountries.has(c.en)} />{tr(locale, c.fr, c.en)}</label>)}
          </div></fieldset>
        <label className="text-sm">{tr(locale, "Fabriqué en (FR)", "Made in (FR)")}<input name="madeIn" defaultValue={cur?.madeIn} className={field} /></label>
        <label className="text-sm">{tr(locale, "Fabriqué en (EN)", "Made in (EN)")}<input name="madeInEn" defaultValue={cur?.madeInEn} className={field} /></label>
        <fieldset className="text-sm sm:col-span-2"><legend>{tr(locale, "Catégories Epomta", "Epomta categories")}</legend>
          <div className="mt-1 flex flex-wrap gap-3">{CATS.map(([v, fr, en]) => <label key={v} className="flex items-center gap-2"><input type="checkbox" name="categories" value={v} defaultChecked={selCats.has(v)} />{tr(locale, fr, en)}</label>)}</div></fieldset>
        <label className="text-sm">{tr(locale, "Spécialité (FR)", "Specialty (FR)")}<input name="specialty" defaultValue={cur?.specialty} className={field} /></label>
        <label className="text-sm">{tr(locale, "Spécialité (EN)", "Specialty (EN)")}<input name="specialtyEn" defaultValue={cur?.specialtyEn} className={field} /></label>
        <label className="text-sm">{tr(locale, "Bio (FR)", "Bio (FR)")}<textarea name="bio" rows={4} defaultValue={cur?.bio} className={field} /></label>
        <label className="text-sm">{tr(locale, "Bio (EN)", "Bio (EN)")}<textarea name="bioEn" rows={4} defaultValue={cur?.bioEn} className={field} /></label>
        <label className="text-sm sm:col-span-2">{tr(locale, "Photo (URL https://… ou /chemin)", "Photo (URL https://… or /path)")}<input name="image" defaultValue={cur?.image} className={field} /></label>
        <label className="text-sm">{tr(locale, "Site (privé)", "Website (private)")}<input name="website" defaultValue={cur?.privateWebsite} className={field} /></label>
        <label className="text-sm">{tr(locale, "E-mail (privé)", "E-mail (private)")}<input name="email" defaultValue={cur?.privateEmail} className={field} /></label>
        <label className="text-sm">Instagram ({tr(locale, "privé", "private")})<input name="instagram" defaultValue={cur?.privateInstagram} className={field} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={cur ? cur.published : true} />{tr(locale, "Publié (visible dans la liste Artistes)", "Published (visible in the Artists list)")}</label>
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" className={`${btn} bg-primary text-primary-foreground`}>{tr(locale, "Enregistrer", "Save")}</button>
          {cur && <a href="?" className={`${btn} border`}>{tr(locale, "Annuler", "Cancel")}</a>}
        </div>
      </form>
      <form method="get" className="flex gap-2"><input name="q" defaultValue={q} placeholder={tr(locale, "Rechercher", "Search")} className={field} /><button className={`${btn} border`}>{tr(locale, "Filtrer", "Filter")}</button></form>
      <ul className="divide-y rounded-lg border text-sm">
        {rows.map((r) => (
          <li key={r.slug} className="flex items-center justify-between gap-2 p-3">
            <span>{r.name} <span className="text-xs text-muted-foreground">{r.slug}{r.simuIllustration ? " · simu" : ""}{r.published ? "" : tr(locale, " · dépublié", " · unpublished")}</span></span>
            <a className={`${btn} border`} href={`?edit=${encodeURIComponent(r.slug)}`}>{tr(locale, "Modifier", "Edit")}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
