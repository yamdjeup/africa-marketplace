import { ProductForm } from "@/components/fournisseur/product-form";
import { db } from "@/lib/db";
import { getPortalContext } from "@/lib/supplier";
import { tr } from "@/lib/tr";
import type { Locale } from "@/lib/i18n";

export const metadata = { title: "Nouvelle création", robots: { index: false } };

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ error?: string }> };

export default async function NewWorkPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, nameEn: true } });
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Nouvelle création", "New creation")}</h1>
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{tr(locale, "Formulaire invalide (vérifiez titre, catégorie, prix, stock, photos et description de 20 caractères min. pour soumettre).", "Invalid form (check title, category, price, stock, photos and a 20-character minimum description to submit).")}</p>}
      <ProductForm locale={locale} categories={categories} readOnly={ctx.viewingAs} />
    </>
  );
}
