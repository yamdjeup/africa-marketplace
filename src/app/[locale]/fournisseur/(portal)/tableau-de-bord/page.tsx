import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Stat } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import { runSubOrderSweep } from "@/lib/order-notify";
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
  await runSubOrderSweep().catch(() => undefined);
  const counts = await db.subOrder.groupBy({ by: ["status"], where: { supplierId: supplier.id }, _count: true });
  const n = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, `Bonjour, ${supplier.displayName}`, `Hello, ${supplier.displayName}`)}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={tr(locale, "Commandes à accepter", "Orders to accept")} value={String(n("PENDING"))} hint={tr(locale, "Réponse sous 48 h", "Reply within 48 h")} />
        <Stat label={tr(locale, "À préparer / expédier", "To prepare / ship")} value={String(n("ACCEPTED") + n("PREPARING"))} />
        <Stat label={tr(locale, "En livraison", "In transit")} value={String(n("SHIPPED"))} />        <Stat label={tr(locale, "Pays", "Country")} value={supplier.country} />
        <Stat label={tr(locale, "Spécialité", "Craft")} value={supplier.craftType} />
        <Stat label={tr(locale, "Commission plateforme", "Platform commission")} value={`${Math.round(supplier.commissionRate * 1000) / 10} %`} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={`${base}/profil`} className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Modifier mon profil", "Edit my profile")}</Link>
      </div>
    </>
  );
}
