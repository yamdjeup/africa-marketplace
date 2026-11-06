import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Stat } from "@/components/fournisseur/parts";
import { getPortalContext } from "@/lib/supplier";
import { tr } from "@/lib/tr";
import type { Locale } from "@/lib/i18n";

export const metadata = { title: "Tableau de bord partenaire", robots: { index: false } };

export default async function Dashboard({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { supplier } = ctx;
  const base = `/${locale}/fournisseur`;
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, `Bonjour, ${supplier.displayName}`, `Hello, ${supplier.displayName}`)}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={tr(locale, "Pays", "Country")} value={supplier.country} />
        <Stat label={tr(locale, "Spécialité", "Craft")} value={supplier.craftType} />
        <Stat label={tr(locale, "Commission plateforme", "Platform commission")} value={`${Math.round(supplier.commissionRate * 1000) / 10} %`} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={`${base}/profil`} className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Modifier mon profil", "Edit my profile")}</Link>
      </div>
    </>
  );
}
