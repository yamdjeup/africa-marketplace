import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";
import { setViewAs } from "../../fournisseur/actions";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const list = await db.supplier.findMany({ orderBy: { createdAt: "asc" }, include: { user: { select: { email: true } } } });
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Partenaires", "Partners")}</h1>
      <p className="text-sm text-muted-foreground">{tr(locale, "Les partenaires de démonstration peuvent être ouverts en vue admin (lecture seule).", "Demo partners can be opened in admin view (read-only).")}</p>
      <ul className="divide-y rounded-lg border bg-card">
        {list.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span>
              <strong>{s.displayName}</strong> · {s.country} · {s.craftType} · {Math.round(s.commissionRate * 1000) / 10} %
              <span className="ml-2 text-xs text-muted-foreground">{s.isDemo ? tr(locale, "démo", "demo") : s.user?.email}</span>
            </span>
            {s.isDemo && (
              <form action={setViewAs}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="supplierId" value={s.id} />
                <button className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Voir son espace", "View its area")}</button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <Link href={`/${locale}/account`} className="text-sm underline">{tr(locale, "Retour au compte", "Back to account")}</Link>
    </>
  );
}
