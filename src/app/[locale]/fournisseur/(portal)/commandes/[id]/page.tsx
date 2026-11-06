import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill } from "@/components/fournisseur/parts";
import { TrackingForm } from "@/components/fournisseur/forms";
import type { Locale } from "@/lib/i18n";
import { COMMISSION_RATE, ORDERS, STATUS_LABEL, money, tr } from "@/lib/supplier-mock";

export const metadata = { title: "Détail de la commande", robots: { index: false } };

export default async function OrderDetail({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const o = ORDERS.find((x) => x.id === id);
  if (!o) notFound();
  const lk = locale === "en" ? "en" : "fr";
  const commission = o.total * COMMISSION_RATE;
  return (
    <>
      <Link href={`/${locale}/fournisseur/commandes`} className="inline-flex min-h-11 items-center text-sm underline">← {tr(locale, "Commandes", "Orders")}</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl text-primary">{o.id}</h1>
        <Pill cls={STATUS_LABEL[o.status].cls}>{STATUS_LABEL[o.status][lk]}</Pill>
      </div>
      <dl className="grid max-w-2xl gap-3 rounded-lg border bg-card p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">{tr(locale, "Œuvre", "Artwork")}</dt><dd>{o.item[lk]}</dd></div>
        <div><dt className="text-muted-foreground">Date</dt><dd>{o.date}</dd></div>
        <div><dt className="text-muted-foreground">{tr(locale, "Acheteur (fictif)", "Buyer (fictional)")}</dt><dd>{o.buyer} · {o.country}</dd></div>
        <div><dt className="text-muted-foreground">Total</dt><dd>{money(locale, o.total, o.currency)}</dd></div>
        <div><dt className="text-muted-foreground">{tr(locale, "Commission plateforme", "Platform commission")} ({COMMISSION_RATE * 100} %)</dt><dd>− {money(locale, commission, o.currency)}</dd></div>
        <div><dt className="text-muted-foreground">{tr(locale, "Net fournisseur", "Supplier net")}</dt><dd className="font-semibold">{money(locale, o.total - commission, o.currency)}</dd></div>
      </dl>
      <section className="max-w-2xl space-y-3">
        <h2 className="font-heading text-xl">{tr(locale, "Expédition", "Shipping")}</h2>
        <TrackingForm locale={locale} initial={o.tracking} />
      </section>
    </>
  );
}
