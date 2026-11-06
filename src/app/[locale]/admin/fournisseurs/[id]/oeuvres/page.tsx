import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const dynamic = "force-dynamic";

const STATUS: Record<string, [string, string]> = {
  DRAFT: ["Brouillon", "Draft"],
  SUBMITTED: ["En attente", "Pending"],
  PUBLISHED: ["Publiée", "Published"],
  REJECTED: ["Refusée", "Rejected"],
  HELD: ["Suspendue", "Held"],
};

export default async function AdminPartnerWorksPage({ params, searchParams }: { params: Promise<{ locale: Locale; id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier || supplier.isDemo) notFound();
  const works = await db.product.findMany({ where: { supplierId: id }, orderBy: { createdAt: "desc" }, select: { slug: true, name: true, nameEn: true, status: true, stock: true, reserved: true, createdByAdmin: true } });
  const fr = locale !== "en";
  const active = supplier.status === "ACTIVE";
  return (
    <div className="space-y-4">
      <Link href={`/${locale}/admin/fournisseurs`} className="text-sm underline">← {tr(locale, "Partenaires", "Partners")}</Link>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Œuvres de", "Works by")} {supplier.displayName}</h1>
      {sp.saved && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{sp.saved === "publish" ? tr(locale, "Œuvre publiée.", "Work published.") : sp.saved === "submit" ? tr(locale, "Œuvre envoyée en modération.", "Work sent to moderation.") : tr(locale, "Brouillon enregistré.", "Draft saved.")}</p>}
      {active ? (
        <Link href={`/${locale}/admin/fournisseurs/${id}/oeuvres/nouvelle`} className={buttonVariants({ className: "min-h-11" })}>{tr(locale, "Nouvelle œuvre au nom du partenaire", "New work on behalf of the partner")}</Link>
      ) : <p className="text-sm text-muted-foreground">{tr(locale, "Partenaire non actif : saisie impossible.", "Partner not active: entry disabled.")}</p>}
      {works.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
        <ul className="divide-y rounded-lg border">
          {works.map((w) => (
            <li key={w.slug} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span>
                <strong>{fr ? w.name : w.nameEn}</strong>
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{STATUS[w.status]?.[fr ? 0 : 1] ?? w.status}</span>
                {w.createdByAdmin && <span className="ml-2 text-xs text-muted-foreground">{tr(locale, "Saisie par l'administration", "Entered by administration")}</span>}
              </span>
              <span className="text-xs text-muted-foreground">{tr(locale, "Dispo.", "Avail.")} {w.stock - w.reserved}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{tr(locale, "La modification se fait ensuite dans l'espace du partenaire (stock, signature, attestation).", "Further edits are made in the partner's own space (stock, signature, attestation).")}</p>
    </div>
  );
}
