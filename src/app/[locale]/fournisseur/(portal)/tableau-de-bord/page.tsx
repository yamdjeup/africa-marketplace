import Link from "next/link";
import { Pill, Stat } from "@/components/fournisseur/parts";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { ORDERS, ARTWORKS, COMMISSION_RATE, STATUS_LABEL, money, tr } from "@/lib/supplier-mock";

export const metadata = { title: "Tableau de bord fournisseur", robots: { index: false } };

export default async function Dashboard({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const base = `/${locale}/fournisseur`;
  const gross = ORDERS.reduce((s, o) => s + o.total, 0);
  const todo = ORDERS.filter((o) => o.status === "new" || o.status === "preparing");
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Bonjour, KeNoF (démo)", "Hello, KeNoF (demo)")}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={tr(locale, "Ventes (4 mois)", "Sales (4 months)")} value={money(locale, gross, "XAF")} />
        <Stat label={tr(locale, "Net après commission", "Net after commission")} value={money(locale, gross * (1 - COMMISSION_RATE), "XAF")} hint={`${COMMISSION_RATE * 100} %`} />
        <Stat label={tr(locale, "À expédier", "To ship")} value={String(todo.length)} />
        <Stat label={tr(locale, "Œuvres en ligne", "Live artworks")} value={String(ARTWORKS.filter((a) => a.status === "published").length)} />
      </div>
      <section className="space-y-3">
        <h2 className="font-heading text-xl">{tr(locale, "À traiter", "To do")}</h2>
        <ul className="divide-y rounded-lg border bg-card">
          {todo.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span><strong>{o.id}</strong> · {tr(locale, o.item.fr, o.item.en)}</span>
              <span className="flex items-center gap-3">
                <Pill cls={STATUS_LABEL[o.status].cls}>{STATUS_LABEL[o.status][locale === "en" ? "en" : "fr"]}</Pill>
                <Link href={`${base}/commandes/${o.id}`} className="min-h-11 content-center underline">{tr(locale, "Ouvrir", "Open")}</Link>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={`${base}/oeuvres/nouveau`} className={buttonVariants({ className: "min-h-11" })}>{tr(locale, "Déposer une œuvre", "Add an artwork")}</Link>
        <Link href={`${base}/profil`} className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Modifier mon profil", "Edit my profile")}</Link>
      </div>
    </>
  );
}
