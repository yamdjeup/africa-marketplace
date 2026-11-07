import { PhotoUploader } from "@/components/fournisseur/media-fields";
import { ConfirmButton } from "@/components/admin/table-widgets";
import { inputCls } from "@/components/fournisseur/parts";
import { CURRENCIES } from "@/lib/currency";
import { tr } from "@/lib/tr";
import type { Locale } from "@/lib/i18n";
import { saveProduct } from "@/app/[locale]/fournisseur/oeuvres-actions";

type P = {
  slug: string; name: string; nameEn: string; description: string; descriptionEn: string; sourceLang?: string; translationState?: string; categorySlug: string;
  currency: string; priceLocal: number | null; priceCents: number; widthCm: number | null; heightCm: number | null; depthCm: number | null;
  weightG: number | null; material: string | null; lowStockThreshold: number; images: unknown; edition: string | null;
  signatureFileId: string | null; authorAttestedAt: Date | null; status: string;
};

export function ProductForm({ locale, categories, product, readOnly, adminFor }: { locale: Locale; categories: { slug: string; name: string; nameEn: string }[]; product?: P; readOnly: boolean; adminFor?: { id: string; name: string } }) {
  const fr = locale !== "en";
  const images = Array.isArray(product?.images) ? (product!.images as string[]) : [];
  const price = product ? ((product.priceLocal ?? product.priceCents) / 100).toString() : "";
  const locked = product?.status === "SUBMITTED";
  const republish = product?.status === "PUBLISHED" && !adminFor && !readOnly;
  return (
    <form action={saveProduct} className="max-w-3xl space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {adminFor && <input type="hidden" name="asSupplier" value={adminFor.id} />}
      {product && <input type="hidden" name="slug" value={product.slug} />}
      <fieldset disabled={readOnly || locked} className="space-y-5">
        {(() => {
          const src = product?.sourceLang ?? (fr ? "fr" : "en");
          const main = src === "fr" ? { n: product?.name, d: product?.description } : { n: product?.nameEn, d: product?.descriptionEn };
          const other = src === "fr" ? { n: product?.nameEn, d: product?.descriptionEn } : { n: product?.name, d: product?.description };
          const state = product?.translationState ?? "";
          return (
            <div className="space-y-4">
              <label className="block text-sm font-medium">{tr(locale, "Langue de saisie", "Writing language")}
                <select name="sourceLang" defaultValue={src} className={inputCls}><option value="fr">Français</option><option value="en">English</option></select></label>
              <label className="block text-sm font-medium">{tr(locale, "Titre", "Title")}<input name="title" required defaultValue={main.n} className={inputCls} /></label>
              <label className="block text-sm font-medium">{tr(locale, "Description", "Description")}<textarea name="description" rows={5} defaultValue={main.d} className={inputCls} /></label>
              <p className="text-xs text-muted-foreground">{tr(locale, "L'autre langue est traduite automatiquement à l'enregistrement.", "The other language is translated automatically when you save.")}</p>
              {product && (
                <details className="rounded-lg border border-border p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    {tr(locale, "Version dans l'autre langue", "Version in the other language")}
                    {state === "auto" && <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs">{tr(locale, "traduit automatiquement", "automatically translated")}</span>}
                  </summary>
                  <div className="mt-3 space-y-4">
                    <label className="block text-sm font-medium">{tr(locale, "Titre", "Title")} ({src === "fr" ? "EN" : "FR"})<input name="titleOther" defaultValue={other.n} className={inputCls} /></label>
                    <label className="block text-sm font-medium">{tr(locale, "Description", "Description")} ({src === "fr" ? "EN" : "FR"})<textarea name="descriptionOther" rows={5} defaultValue={other.d} className={inputCls} /></label>
                  </div>
                </details>
              )}
            </div>
          );
        })()}
        <label className="block text-sm font-medium">{tr(locale, "Catégorie", "Category")}
          <select name="category" required defaultValue={product?.categorySlug ?? ""} className={inputCls}>
            <option value="" disabled>—</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{fr ? c.name : c.nameEn}</option>)}
          </select></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">{tr(locale, "Prix (devise locale)", "Price (local currency)")}<input name="price" inputMode="decimal" required defaultValue={price} className={inputCls} /></label>
          <label className="block text-sm font-medium">{tr(locale, "Devise", "Currency")}
            <select name="currency" defaultValue={product?.currency ?? "EUR"} className={inputCls}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="block text-sm font-medium">{tr(locale, "Largeur (cm)", "Width (cm)")}<input name="widthCm" inputMode="decimal" defaultValue={product?.widthCm ?? ""} className={inputCls} /></label>
          <label className="block text-sm font-medium">{tr(locale, "Hauteur (cm)", "Height (cm)")}<input name="heightCm" inputMode="decimal" defaultValue={product?.heightCm ?? ""} className={inputCls} /></label>
          <label className="block text-sm font-medium">{tr(locale, "Profondeur (cm)", "Depth (cm)")}<input name="depthCm" inputMode="decimal" defaultValue={product?.depthCm ?? ""} className={inputCls} /></label>
          <label className="block text-sm font-medium">{tr(locale, "Poids (g)", "Weight (g)")}<input name="weightG" inputMode="numeric" defaultValue={product?.weightG ?? ""} className={inputCls} /></label>
        </div>
        <label className="block text-sm font-medium">{tr(locale, "Matière", "Material")}<input name="material" defaultValue={product?.material ?? ""} className={inputCls} /></label>
        <PhotoUploader name="photos" initial={images} max={6} fr={fr} label={tr(locale, "Photos (6 max, la première est la couverture)", "Photos (max 6, first is the cover)")} hint={tr(locale, "Compressées automatiquement (300 Ko max par photo).", "Automatically compressed (300 KB max per photo).")} />
        {!product && (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-semibold">{tr(locale, "Stock initial", "Initial stock")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">{tr(locale, "Quantité", "Quantity")}<input name="stock" inputMode="numeric" defaultValue="1" className={inputCls} /></label>
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="unique" className="size-5" />{tr(locale, "Pièce unique (stock = 1)", "Unique piece (stock = 1)")}</label>
            </div>
            <label className="block text-sm font-medium">{tr(locale, "Ou variantes taille / couleur (une par ligne : « M: 5 »)", "Or size / colour variants (one per line: “M: 5”)")}
              <textarea name="variants" rows={3} placeholder={"S: 3\nM: 5\nL: 2"} className={inputCls} /></label>
          </div>
        )}
        <label className="block text-sm font-medium">{tr(locale, "Seuil d'alerte stock bas", "Low-stock alert threshold")}<input name="lowStock" inputMode="numeric" defaultValue={product?.lowStockThreshold ?? 1} className={inputCls} /></label>
        <details className="rounded-lg border p-4" open={!!(product?.edition || product?.signatureFileId || product?.authorAttestedAt)}>
          <summary className="cursor-pointer text-sm font-semibold">{tr(locale, "Œuvre d'art : authenticité (facultatif, peinture / sculpture / photographie)", "Artwork authenticity (optional, painting / sculpture / photography)")}</summary>
          <div className="mt-3 space-y-4">
            <label className="block text-sm font-medium">{tr(locale, "Édition (« Pièce unique » ou « 3/10 »)", "Edition (“Unique piece” or “3/10”)")}<input name="edition" defaultValue={product?.edition ?? ""} className={inputCls} /></label>
            {!adminFor && <PhotoUploader name="signaturePhoto" kind="signature" max={1} fr={fr} initial={product?.signatureFileId ? [`/api/media/${product.signatureFileId}`] : []} label={tr(locale, "Photo de la signature sur l'œuvre", "Photo of the signature on the work")} />}
            {adminFor ? <p className="text-xs text-muted-foreground">{tr(locale, "Signature et attestation d'auteur : à compléter par le partenaire dans son espace.", "Signature and author attestation: to be completed by the partner in their space.")}</p> : <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="attest" defaultChecked={!!product?.authorAttestedAt} className="mt-0.5 size-5" />
              <span>{tr(locale, "Je certifie être l'auteur de cette création.", "I certify that I am the author of this creation.")}
                {product?.authorAttestedAt && <em className="block text-xs text-muted-foreground">{tr(locale, "Attesté le", "Attested on")}                 {product.authorAttestedAt.toLocaleDateString(fr ? "fr-FR" : "en-GB")}</em>}</span></label>}
          </div>
        </details>
        {republish && <p role="note" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">{tr(locale, "Attention : cette création est publiée. Toute modification (hors stock) la remet « En modération » : elle disparaît du catalogue jusqu'à nouvelle validation.", "Warning: this creation is published. Any change (except stock) sends it back to moderation: it is hidden from the catalogue until approved again.")}</p>}
        <div className="flex flex-wrap gap-3">
          {republish ? (
            <>
              <ConfirmButton name="intent" value="submit" message={tr(locale, "Enregistrer ? La création repassera « En modération » et sera retirée du catalogue jusqu'à validation.", "Save? The creation will go back to moderation and be removed from the catalogue until approved.")} className="min-h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground">{tr(locale, "Enregistrer et renvoyer en modération", "Save and resubmit for review")}</ConfirmButton>
            </>
          ) : (
            <>
          <button type="submit" name="intent" value="draft" className="min-h-11 rounded-md border px-5 text-sm font-medium">{tr(locale, "Enregistrer le brouillon", "Save draft")}</button>
                          <button type="submit" name="intent" value="submit" className="min-h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground">{adminFor ? tr(locale, "Envoyer en modération", "Send to moderation") : tr(locale, "Enregistrer et soumettre à validation", "Save and submit for review")}</button>
                          {adminFor && <button type="submit" name="intent" value="publish" className="min-h-11 rounded-md border-2 border-primary px-5 text-sm font-medium text-primary">{tr(locale, "Publier directement", "Publish now")}</button>}
            </>
          )}
                        </div>
      </fieldset>
      {locked && <p className="text-sm text-muted-foreground">{tr(locale, "Création en cours de modération : modification impossible.", "Creation under review: editing is locked.")}</p>}
    </form>
  );
}
