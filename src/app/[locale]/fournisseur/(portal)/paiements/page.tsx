import { Stat } from "@/components/fournisseur/parts";
import type { Locale } from "@/lib/i18n";
import { COMMISSION_RATE, ORDERS, PAYOUTS, money, tr } from "@/lib/supplier-mock";

export const metadata = { title: "Paiements", robots: { index: false } };

export default async function PaymentsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const lk = locale === "en" ? "en" : "fr";
  const gross = ORDERS.reduce((s, o) => s + o.total, 0);
  const th = "px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground";
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Paiements", "Payments")}</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label={tr(locale, "Ventes brutes", "Gross sales")} value={money(locale, gross, "XAF")} />
        <Stat label={tr(locale, "Commission plateforme", "Platform commission")} value={`− ${money(locale, gross * COMMISSION_RATE, "XAF")}`} hint={`${COMMISSION_RATE * 100} %`} />
        <Stat label={tr(locale, "Net à percevoir", "Net payable")} value={money(locale, gross * (1 - COMMISSION_RATE), "XAF")} />
      </div>
      <section className="space-y-2">
        <h2 className="font-heading text-xl">{tr(locale, "Versements", "Payouts")}</h2>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr><th className={th}>Réf.</th><th className={th}>Date</th><th className={th}>{tr(locale, "Montant", "Amount")}</th><th className={th}>{tr(locale, "Statut", "Status")}</th></tr></thead>
            <tbody className="divide-y">
              {PAYOUTS.map((p) => (
                <tr key={p.id}><td className="px-3 py-2">{p.id}</td><td className="px-3 py-2">{p.date}</td><td className="px-3 py-2">{money(locale, p.amount, "XAF")}</td><td className="px-3 py-2">{p.status[lk]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">{tr(locale, "Chiffres fictifs : aucun versement réel n'est effectué.", "Fictional figures: no real payout is made.")}</p>
      </section>
    </>
  );
}
