import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { balances } from "@/lib/ledger";
import { getPortalContext } from "@/lib/supplier";
import { tr } from "@/lib/tr";

export const metadata = { title: "Paiements", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PartnerPayments({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const sid = ctx.supplier.id;
  const now = new Date();
  const [bal, entries, payouts] = await Promise.all([
    balances(db, sid, now),
    db.ledgerEntry.findMany({ where: { supplierId: sid }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.payout.findMany({ where: { supplierId: sid }, orderBy: { paidAt: "desc" }, take: 50 }),
  ]);
  const subs = await db.subOrder.findMany({ where: { id: { in: entries.map((e) => e.subOrderId) } }, select: { id: true, number: true } });
  const num = new Map(subs.map((s) => [s.id, s.number]));
  const eur = (c: number) => new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR" }).format(c / 100);
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium" });
  const cards: [string, string, number][] = [
    [tr(locale, "En attente", "Pending"), tr(locale, "Livré, délai de retour en cours", "Delivered, return window running"), bal.pending],
    [tr(locale, "Disponible", "Available"), tr(locale, "Prêt à être versé", "Ready to be paid out"), bal.available],
    [tr(locale, "Versé", "Paid out"), tr(locale, "Déjà versé", "Already paid"), bal.paid],
  ];
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Paiements", "Payments")}</h1>
      <p className="rounded-md border border-accent bg-accent/10 p-3 text-sm">{tr(locale, "Paiement test : aucun argent réel n'est encaissé ni versé.", "Test payment: no real money is collected or paid out.")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(([t, hint, v]) => (
          <div key={t} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{t}</p>
            <p className="font-heading text-2xl text-primary">{eur(v)}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {tr(locale, "Commission de la plateforme", "Platform commission")} : {Math.round(ctx.supplier.commissionRate * 1000) / 10} % · {tr(locale, "Cumul ventes", "Total sales")} {eur(bal.gross)} · {tr(locale, "commission", "commission")} {eur(bal.commission)}
      </p>
      <h2 className="font-heading text-2xl text-primary">{tr(locale, "Ventes", "Sales")}</h2>
      {entries.length === 0 ? <p className="text-sm text-muted-foreground">{tr(locale, "Aucune vente livrée pour l'instant.", "No delivered sale yet.")}</p> : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-muted/50 text-left"><tr>
              <th className="p-2">{tr(locale, "Commande", "Order")}</th><th className="p-2 text-right">{tr(locale, "Montant client", "Customer amount")}</th><th className="p-2 text-right">{tr(locale, "Commission", "Commission")}</th><th className="p-2 text-right">{tr(locale, "Votre part", "Your share")}</th><th className="p-2">{tr(locale, "État", "Status")}</th>
            </tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2">{num.get(e.subOrderId) ?? e.subOrderId}<span className="block text-xs text-muted-foreground">{fmt.format(e.createdAt)}</span></td>
                  <td className="p-2 text-right">{eur(e.grossCents)}</td>
                  <td className="p-2 text-right">−{eur(e.commissionCents)} ({Math.round(e.commissionRate * 1000) / 10} %)</td>
                  <td className="p-2 text-right font-medium">{eur(e.netCents)}</td>
                  <td className="p-2">{e.reversedAt ? tr(locale, "Annulé", "Reversed") : e.payoutId ? tr(locale, "Versé", "Paid out") : e.availableAt <= now ? tr(locale, "Disponible", "Available") : `${tr(locale, "En attente jusqu'au", "Pending until")} ${fmt.format(e.availableAt)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h2 className="font-heading text-2xl text-primary">{tr(locale, "Versements", "Payouts")}</h2>
      {payouts.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
        <ul className="divide-y rounded-lg border">
          {payouts.map((p) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
              <span>{fmt.format(p.paidAt)} · {p.reference}</span><strong>{eur(p.amountCents)}</strong>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
