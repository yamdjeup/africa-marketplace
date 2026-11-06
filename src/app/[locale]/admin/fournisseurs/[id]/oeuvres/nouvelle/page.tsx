import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/fournisseur/product-form";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const dynamic = "force-dynamic";

export default async function AdminNewWorkPage({ params, searchParams }: { params: Promise<{ locale: Locale; id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier || supplier.isDemo || supplier.status !== "ACTIVE") notFound();
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, nameEn: true } });
  return (
    <div className="space-y-4">
      <Link href={`/${locale}/admin/fournisseurs/${id}/oeuvres`} className="text-sm underline">← {supplier.displayName}</Link>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Nouvelle création pour", "New creation for")} {supplier.displayName}</h1>
      <p className="text-sm text-muted-foreground">{tr(locale, "Saisie au nom du partenaire (commission et stock inchangés).", "Entered on behalf of the partner (commission and stock unchanged).")}</p>
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{tr(locale, "Formulaire invalide (vérifiez titre, catégorie, prix, stock, photos et description de 20 caractères min. pour publier ou soumettre).", "Invalid form (check title, category, price, stock, photos and a 20-character minimum description to publish or submit).")}</p>}
      <ProductForm locale={locale} categories={categories} readOnly={false} adminFor={{ id, name: supplier.displayName }} />
    </div>
  );
}
