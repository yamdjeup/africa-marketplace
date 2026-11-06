import { buttonVariants } from "@/components/ui/button";
import { inputCls } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { balances } from "@/lib/ledger";
import { tr } from "@/lib/tr";
import { markPayoutAction, releaseEntryAction, setCommissionAction } from "../versements-actions";

export const dynamic = "force-dynamic";

export default async function PayoutsAdmin({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const now = new Date();
  const withEntries = await db.ledgerEntry.findMany({ distinct: ["supplierId"], select: { supplierId: true } });
  const list = await db.supplier.findMany({ where: { id: { in: withEntries.map((w) => w.supplierId) } }, orderBy: { displayName: "asc" } });
  const rows = await Promise.all(list.map(async (s) => ({ s, bal: await balances(db, s.id, now) })));
  const pendingEntries = await db.ledgerEntry.findMany({ where: { payoutId: null, reversedAt: null, availableAt: { gt: now } }, orderBy: { availableAt: "asc" }, take: 50 });
  const subs = await db.subOrder.findMany({ where: { id: { in: pendingEntries.map((e) => e.subOrderId) } }, select: { id: true, number: true } });
  const num = new Map(subs.map((x) => [x.id, x.number]));
  const names = new Map(list.map((x) => [x.id, x.displayName]));
  const payouts = await db.payout.findMany({ orderBy: { paidAt: "desc" }, take: 30 });
  const eur = (c: number) => new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR" }).format(c / 100);
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium", timeStyle: "short" });
  const msg: Record<string, [string, string]> = {
    paid: ["Versement enregistré, partenaire prévenu par e-mail.", "Payout recorded, partner notified by email."],
    released: ["Gain rendu disponible.", "Earning made available."],
    rate: ["Commission mise à jour (appliquée aux prochaines livraisons).", "Commission updated (applies to future deliveries)."],
  };
  const err: Record<string, [string, string]> = { nothing: ["Aucun solde disponible à verser.", "No available balance to pay out."], rate: ["Taux invalide (0 à 50 %).", "Invalid rate (0–50%)."] };
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Versements", "Payouts")}</h1>
      <p className="rounded-md border border-accent bg-accent/10 p-3 text-sm">{tr(locale, "Mode test : marquer un versement n'envoie aucun argent réel.", "Test mode: marking a payout sends no real money.")}</p>
      {sp.ok && msg[sp.ok] && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, ...msg[sp.ok])}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{err[sp.error] ? tr(locale, ...err[sp.error]) : tr(locale, "Erreur.", "Error.")}</p>}
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{tr(locale, "Aucune vente livrée pour l'instant.", "No delivered sale yet.")}</p> : (
        <ul className="divide-y rounded-lg border bg-card">
          {rows.map(({ s, bal }) => (
            <li key={s.id} className="space-y-2 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{s.displayName}</strong>
                <span className="text-muted-foreground">{tr(locale, "En attente", "Pending")} {eur(bal.pending)} · {tr(locale, "Disponible", "Available")} <strong className="text-foreground">{eur(bal.available)}</strong> · {tr(locale, "Versé", "Paid")} {eur(bal.paid)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{tr(locale, "Ventes", "Sales")} {eur(bal.gross)} · {tr(locale, "commission plateforme", "platform commission")} {eur(bal.commission)}</p>
              <div className="flex flex-wrap items-end gap-3">
                <form action={markPayoutAction}>
                  <input type="hidden" name="supplierId" value={s.id} />
                  <button disabled={bal.available <= 0} className={buttonVariants({ className: "min-h-11" })}>{tr(locale, "Marquer le versement effectué", "Mark payout as done")}</button>
                </form>
                <form action={setCommissionAction} className="flex items-end gap-2">
                  <input type="hidden" name="supplierId" value={s.id} />
                  <label className="text-xs">{tr(locale, "Commission (%)", "Commission (%)")}<input name="rate" inputMode="decimal" defaultValue={Math.round(s.commissionRate * 1000) / 10} className={`${inputCls} w-24`} /></label>
                  <button className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Enregistrer", "Save")}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      {pendingEntries.length > 0 && (
        <>
          <h2 className="font-heading text-2xl text-primary">{tr(locale, "Gains en attente (délai de retour)", "Pending earnings (return window)")}</h2>
          <ul className="divide-y rounded-lg border text-sm">
            {pendingEntries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span>{names.get(e.supplierId)} · {num.get(e.subOrderId)} · {eur(e.netCents)} · {tr(locale, "disponible le", "available on")} {fmt.format(e.availableAt)}</span>
                <form action={releaseEntryAction}><input type="hidden" name="id" value={e.id} /><button className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Rendre disponible (test)", "Make available (test)")}</button></form>
              </li>
            ))}
          </ul>
        </>
      )}
      <h2 className="font-heading text-2xl text-primary">{tr(locale, "Historique des versements", "Payout history")}</h2>
      {payouts.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
        <ul className="space-y-1 text-sm">
          {payouts.map((p) => <li key={p.id}>{fmt.format(p.paidAt)} · {names.get(p.supplierId) ?? p.supplierId} · <strong>{eur(p.amountCents)}</strong> · {p.reference} · {p.paidBy}</li>)}
        </ul>
      )}
    </>
  );
}
