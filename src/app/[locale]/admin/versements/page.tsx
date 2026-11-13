import { buttonVariants } from "@/components/ui/button";
import { inputCls } from "@/components/fournisseur/parts";
import { ListFilters, Pager } from "@/components/admin/list-controls";
import { PAYOUT_FILTERS, has, ledgerWhere, pageArgs, pageCount, parseList, payoutHistoryWhere, type ListParams } from "@/lib/admin-list";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { balances } from "@/lib/ledger";
import { connectEnabled } from "@/lib/stripe-connect";
import { tr } from "@/lib/tr";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { markPayoutAction, releaseEntryAction, setCommissionAction } from "../versements-actions";

export const dynamic = "force-dynamic";

export default async function PayoutsAdmin({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<ListParams & { ok?: string; error?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const now = new Date();
  const q = parseList(sp, PAYOUT_FILTERS, "topay", ["displayName"], "displayName");
  const withEntries = await db.ledgerEntry.groupBy({ by: ["supplierId"], where: ledgerWhere(q.st, now) });
  const ids = withEntries.map((w) => w.supplierId);
  const sWhere = { id: { in: ids }, ...(q.q ? { displayName: has(q.q) } : {}) };
  const total = await db.supplier.count({ where: sWhere });
  q.page = Math.min(q.page, pageCount(total));
  const list = await db.supplier.findMany({ where: sWhere, orderBy: { displayName: q.asc ? "desc" : "asc" }, ...pageArgs(q.page) });
  const rows = await Promise.all(list.map(async (s) => ({ s, bal: await balances(db, s.id, now) })));
  const pendingEntries = q.st === "topay" ? [] : await db.ledgerEntry.findMany({ where: { ...ledgerWhere("pending", now), ...(q.q ? { supplierId: { in: (await db.supplier.findMany({ where: { displayName: has(q.q) }, select: { id: true }, take: 50 })).map((x) => x.id) } } : {}) }, orderBy: { availableAt: "asc" }, take: 25 });
  const subs = await db.subOrder.findMany({ where: { id: { in: pendingEntries.map((e) => e.subOrderId) } }, select: { id: true, number: true } });
  const num = new Map(subs.map((x) => [x.id, x.number]));
  const matchIds = q.q ? (await db.supplier.findMany({ where: { displayName: has(q.q) }, select: { id: true }, take: 50 })).map((x) => x.id) : [];
  const payouts = await db.payout.findMany({ where: payoutHistoryWhere(q, matchIds), orderBy: { paidAt: "desc" }, take: 25 });
  const nameRows = await db.supplier.findMany({ where: { id: { in: [...new Set([...pendingEntries.map((e) => e.supplierId), ...payouts.map((p) => p.supplierId), ...list.map((x) => x.id)])] } }, select: { id: true, displayName: true } });
  const names = new Map(nameRows.map((x) => [x.id, x.displayName]));
  const path = `/${locale}/admin/versements`;
  const nToPay = (await db.ledgerEntry.groupBy({ by: ["supplierId"], where: ledgerWhere("topay", now) })).length;
  const tabs = [{ value: "topay", label: tr(locale, "À payer", "To pay"), count: nToPay }, { value: "pending", label: tr(locale, "En attente (délai de retour)", "Pending (return window)") }, { value: "all", label: tr(locale, "Tous les partenaires", "All partners") }];
  const eur = (c: number) => new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR" }).format(c / 100);
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium", timeStyle: "short" });
  const msg: Record<string, [string, string]> = {
    paid: ["Versement enregistré, partenaire prévenu par e-mail.", "Payout recorded, partner notified by email."],
    released: ["Gain rendu disponible.", "Earning made available."],
    rate: ["Commission mise à jour (appliquée aux prochaines livraisons).", "Commission updated (applies to future deliveries)."],
  };
  const err: Record<string, [string, string]> = { kyc: ["Versement bloqu\u00e9 : le compte Stripe du partenaire n'est pas v\u00e9rifi\u00e9.", "Payout blocked: the partner's Stripe account is not verified."], transfer: ["Le transfert Stripe a \u00e9chou\u00e9 : rien n'a \u00e9t\u00e9 marqu\u00e9 vers\u00e9, r\u00e9essayez.", "The Stripe transfer failed: nothing was marked as paid, try again."], nothing: ["Aucun solde disponible à verser.", "No available balance to pay out."], rate: ["Taux invalide (0 à 50 %).", "Invalid rate (0–50%)."] };
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Versements", "Payouts")}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{tr(locale, "Cycle : colis livré → gains « en attente » pendant le délai de retour → « disponible » → « à payer » → « Marquer le versement effectué » → historique.", "Cycle: parcel delivered → earnings “pending” during the return period → “available” → “to pay” → “Mark payout as done” → history.")}</p>
      <p className="rounded-md border border-accent bg-accent/10 p-3 text-sm">{tr(locale, "Marquer un versement l'enregistre dans le registre.", "Marking a payout records it in the ledger.")}</p>
      {sp.ok && msg[sp.ok] && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, ...msg[sp.ok])}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{err[sp.error] ? tr(locale, ...err[sp.error]) : tr(locale, "Erreur.", "Error.")}</p>}
      <ListFilters locale={locale} path={path} q={q} tabs={tabs} defaultStatus="topay" />
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{tr(locale, "Aucune vente livrée pour l'instant.", "No delivered sale yet.")}</p> : (
        <ul className="divide-y rounded-lg border bg-card">
          {rows.map(({ s, bal }) => (
            <li key={s.id} className="space-y-2 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{s.displayName}</strong>{connectEnabled() && <span className="rounded border px-2 py-0.5 text-xs" data-testid="connect-status">Stripe : {s.stripeConnectStatus}</span>}
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
      <Pager locale={locale} path={path} q={q} total={total} defaultStatus="topay" />
      {pendingEntries.length > 0 && (
        <>
          <h2 className="font-heading text-2xl text-primary">{tr(locale, "Gains en attente (délai de retour)", "Pending earnings (return window)")}</h2>
          <ul className="divide-y rounded-lg border text-sm">
            {pendingEntries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span>{names.get(e.supplierId)} · {num.get(e.subOrderId)} · {eur(e.netCents)} · {tr(locale, "disponible le", "available on")} {fmt.format(e.availableAt)}</span>
                <form action={releaseEntryAction}><input type="hidden" name="id" value={e.id} /><ConfirmButton className={buttonVariants({ variant: "outline", className: "min-h-11" })} title={tr(locale, "Ignore le délai de retour : le gain devient payable tout de suite.", "Skips the return period: the earning becomes payable now.")} message={tr(locale, "Rendre ce gain disponible maintenant, sans attendre la fin du délai de retour ?", "Make this earning available now, without waiting for the return period to end?")}>{tr(locale, "Rendre disponible maintenant (ignorer le délai de retour)", "Make available now (skip the return period)")}</ConfirmButton></form>
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
