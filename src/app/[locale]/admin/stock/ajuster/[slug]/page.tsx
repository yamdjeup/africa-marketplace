import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";
import { adminAdjustStockAction } from "../../../stock-actions";

export const dynamic = "force-dynamic";
const inputCls = "mt-1 block min-h-11 w-full rounded-md border bg-background px-3 text-sm";

export default async function AdminAdjustStock({ params, searchParams }: { params: Promise<{ locale: Locale; slug: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const p = await db.product.findUnique({ where: { slug }, include: { variants: true } });
  if (!p) notFound();
  const fr = locale !== "en";
  const errors: Record<string, string> = {
    delta: tr(locale, "Quantité invalide (entier non nul).", "Invalid quantity (non-zero integer)."),
    reason: tr(locale, "Le motif est obligatoire.", "A reason is required."),
    below: tr(locale, "Impossible : le stock physique ne peut pas descendre sous le stock réservé.", "Not possible: on-hand stock cannot go below reserved stock."),
  };
  return (
    <div className="max-w-3xl space-y-4">
      <Link href={`/${locale}/admin/stock`} className="text-sm underline">← {tr(locale, "Stocks", "Stock")}</Link>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Ajuster le stock", "Adjust stock")} — {fr ? p.name : p.nameEn}</h1>
      <p className="text-sm">{tr(locale, "Physique", "On hand")} {p.stock} · {tr(locale, "Réservé", "Reserved")} {p.reserved} · <strong>{tr(locale, "Disponible", "Available")} {p.stock - p.reserved}</strong> ({tr(locale, "unités", "units")})</p>
      {p.variants.length > 0 && <ul className="text-sm">{p.variants.map((v) => <li key={v.id}>{v.label} : {v.stock - v.reserved} {tr(locale, "dispo.", "avail.")} ({v.stock} / {v.reserved} {tr(locale, "rés.", "res.")})</li>)}</ul>}
      {sp.saved && <p role="status" className="rounded-md border border-green-600 bg-green-50 p-3 text-sm text-green-900">{tr(locale, "Stock mis à jour et journalisé.", "Stock updated and logged.")}</p>}
      {sp.error && errors[sp.error] && <p role="alert" className="rounded-md border border-red-600 bg-red-50 p-3 text-sm text-red-900">{errors[sp.error]}</p>}
      <form action={adminAdjustStockAction} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="slug" value={p.slug} />
        <label className="text-sm font-medium">Type
          <select name="type" className={inputCls}><option value="ENTRY">{tr(locale, "Entrée de stock", "Stock in")}</option><option value="ADJUST">{tr(locale, "Correction (+/−)", "Correction (+/−)")}</option></select></label>
        {p.variants.length > 0 && (
          <label className="text-sm font-medium">{tr(locale, "Variante", "Variant")}
            <select name="variant" className={inputCls}>{p.variants.map((v) => <option key={v.id}>{v.label}</option>)}</select></label>
        )}
        <label className="text-sm font-medium">{tr(locale, "Quantité (unités)", "Quantity (units)")}<input name="delta" inputMode="numeric" required className={inputCls} /></label>
        <label className="text-sm font-medium sm:col-span-2">{tr(locale, "Motif (obligatoire)", "Reason (required)")}<input name="reason" required className={inputCls} /></label>
        <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground sm:col-span-5 sm:justify-self-start">{tr(locale, "Appliquer", "Apply")}</button>
      </form>
    </div>
  );
}
