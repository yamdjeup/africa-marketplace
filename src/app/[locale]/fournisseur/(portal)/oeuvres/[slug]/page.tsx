import { notFound } from "next/navigation";
import { ProductForm } from "@/components/fournisseur/product-form";
import { inputCls } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import { MOVEMENT_LABELS } from "@/lib/stock";
import { getPortalContext } from "@/lib/supplier";
import { tr } from "@/lib/tr";
import type { Locale } from "@/lib/i18n";
import { addVariantAction, adjustStockAction, deleteProduct } from "../../../oeuvres-actions";

export const metadata = { title: "Création", robots: { index: false } };

type Props = { params: Promise<{ locale: Locale; slug: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function EditWorkPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const p = await db.product.findFirst({ where: { slug, supplierId: ctx.supplier.id }, include: { variants: true } });
  if (!p) notFound();
  const [categories, moves] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, nameEn: true } }),
    db.stockMovement.findMany({ where: { productSlug: slug }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const fr = locale !== "en";
  const ro = ctx.viewingAs;
  const vlabel = new Map(p.variants.map((v) => [v.id, v.label]));
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{fr ? p.name : p.nameEn}</h1>
      {sp.saved && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, "Enregistré.", "Saved.")}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{tr(locale, "Action impossible (vérifiez les champs, ou le stock réservé).", "Action not possible (check fields, or reserved stock).")}</p>}
      {p.status === "REJECTED" && p.rejectReason && <p className="rounded-md border border-destructive p-3 text-sm"><strong>{tr(locale, "Refusée : ", "Rejected: ")}</strong>{p.rejectReason}</p>}
      <ProductForm locale={locale} categories={categories} product={p} readOnly={ro} />

      <section id="stock" className="max-w-3xl space-y-4">
        <h2 className="font-heading text-2xl text-primary">{tr(locale, "Stock", "Stock")}</h2>
        <p className="text-sm">{tr(locale, "Physique", "On hand")} {p.stock} · {tr(locale, "Réservé", "Reserved")} {p.reserved} · <strong>{tr(locale, "Disponible", "Available")} {p.stock - p.reserved}</strong></p>
        {p.variants.length > 0 && (
          <ul className="text-sm">{p.variants.map((v) => <li key={v.id}>{v.label} : {v.stock - v.reserved} {tr(locale, "dispo.", "avail.")} ({v.stock} / {v.reserved} {tr(locale, "rés.", "res.")})</li>)}</ul>
        )}
        {!ro && (
          <>
            <form action={adjustStockAction} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-5">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="slug" value={p.slug} />
              <label className="text-sm font-medium">{tr(locale, "Type", "Type")}
                <select name="type" className={inputCls}><option value="ENTRY">{tr(locale, "Entrée de stock", "Stock in")}</option><option value="ADJUST">{tr(locale, "Correction (+/−)", "Correction (+/−)")}</option></select></label>
              {p.variants.length > 0 && (
                <label className="text-sm font-medium">{tr(locale, "Variante", "Variant")}
                  <select name="variant" className={inputCls}>{p.variants.map((v) => <option key={v.id}>{v.label}</option>)}</select></label>
              )}
              <label className="text-sm font-medium">{tr(locale, "Quantité", "Quantity")}<input name="delta" inputMode="numeric" required className={inputCls} /></label>
              <label className="text-sm font-medium sm:col-span-2">{tr(locale, "Motif", "Reason")}<input name="reason" className={inputCls} /></label>
              <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground sm:col-span-5 sm:justify-self-start">{tr(locale, "Appliquer", "Apply")}</button>
            </form>
            <form action={addVariantAction} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="slug" value={p.slug} />
              <label className="text-sm font-medium">{tr(locale, "Nouvelle variante (taille / couleur)", "New variant (size / colour)")}<input name="label" required className={inputCls} /></label>
              <label className="text-sm font-medium">{tr(locale, "Stock initial", "Initial stock")}<input name="qty" inputMode="numeric" defaultValue="1" className={inputCls} /></label>
              <button type="submit" className="min-h-11 self-end rounded-md border px-4 text-sm font-medium">{tr(locale, "Ajouter la variante", "Add variant")}</button>
            </form>
          </>
        )}
        <h3 className="font-semibold">{tr(locale, "Historique des mouvements", "Movement history")}</h3>
        {moves.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b text-xs uppercase text-muted-foreground"><th className="py-2 pr-3">Date</th><th className="pr-3">Type</th><th className="pr-3">Qté</th><th className="pr-3">{tr(locale, "Motif", "Reason")}</th><th>{tr(locale, "Auteur", "Author")}</th></tr></thead>
              <tbody>{moves.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="py-2 pr-3 whitespace-nowrap">{m.createdAt.toLocaleString(fr ? "fr-FR" : "en-GB")}</td>
                  <td className="pr-3">{MOVEMENT_LABELS[m.type as keyof typeof MOVEMENT_LABELS]?.[fr ? "fr" : "en"] ?? m.type}{m.variantId && vlabel.get(m.variantId) ? ` (${vlabel.get(m.variantId)})` : ""}</td>
                  <td className="pr-3">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                  <td className="pr-3">{m.reason}</td><td>{m.authorLabel}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </section>
      {!ro && ["DRAFT", "REJECTED"].includes(p.status) && (
        <form action={deleteProduct}>
          <input type="hidden" name="locale" value={locale} /><input type="hidden" name="slug" value={p.slug} />
          <button type="submit" className="min-h-11 rounded-md border border-destructive px-4 text-sm text-destructive">{tr(locale, "Supprimer ce brouillon", "Delete this draft")}</button>
        </form>
      )}
    </>
  );
}
