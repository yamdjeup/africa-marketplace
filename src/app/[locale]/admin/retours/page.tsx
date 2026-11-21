import { buttonVariants } from "@/components/ui/button";
import { inputCls } from "@/components/fournisseur/parts";
import { ListFilters, Pager } from "@/components/admin/list-controls";
import { RETURN_FILTERS, pageArgs, pageCount, parseList, returnsWhere, type ListParams } from "@/lib/admin-list";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { returnLabel } from "@/lib/returns";
import { tr } from "@/lib/tr";
import { parsePhotoIds } from "@/lib/return-photos";
import { StockChoice } from "@/components/admin/stock-choice";
import { decideReturnAction, markReceivedAction, refundReturnAction } from "../retours-actions";

export const dynamic = "force-dynamic";

export default async function ReturnsAdmin({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<ListParams & { ok?: string; error?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = parseList(sp, RETURN_FILTERS, "REQUESTED", ["createdAt"], "createdAt");
  const where = returnsWhere(q);
  const total = await db.returnRequest.count({ where });
  q.page = Math.min(q.page, pageCount(total));
  const [list, nReq, nAcc, nRec] = await Promise.all([db.returnRequest.findMany({ where, orderBy: { createdAt: q.asc ? "asc" : "desc" }, ...pageArgs(q.page), include: { subOrder: { select: { number: true, subtotalCents: true } } } }), db.returnRequest.count({ where: { status: "REQUESTED" } }), db.returnRequest.count({ where: { status: "ACCEPTED" } }), db.returnRequest.count({ where: { status: "RECEIVED" } })]);
  const path = `/${locale}/admin/retours`;
  const tabs = [{ value: "REQUESTED", label: tr(locale, "À traiter", "To handle"), count: nReq }, { value: "ACCEPTED", label: tr(locale, "Acceptés (à recevoir)", "Accepted (to receive)"), count: nAcc }, { value: "RECEIVED", label: tr(locale, "Reçus (à rembourser)", "Received (to refund)"), count: nRec }, { value: "REFUNDED", label: tr(locale, "Remboursés", "Refunded") }, { value: "REFUSED", label: tr(locale, "Refusés", "Refused") }, { value: "all", label: tr(locale, "Tous", "All") }];
  const eur = (c: number) => new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR" }).format(c / 100);
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium" });
  const ok: Record<string, [string, string]> = { received: ["Colis reçu enregistré, client prévenu.", "Parcel received recorded, customer notified."], accepted: ["Retour accepté, client prévenu.", "Return accepted, customer notified."], refused: ["Retour refusé, client prévenu.", "Return refused, customer notified."], refunded: ["Remboursement enregistré, client prévenu.", "Refund recorded, customer notified."] };
  const err: Record<string, [string, string]> = { state: ["Cette demande a déjà été traitée.", "This request has already been handled."], stock: ["Choisissez la sortie du colis ; « Exclure du stock » exige un motif.", "Choose the parcel outcome; “Exclude from stock” requires a reason."], refund: ["Remboursement Stripe non effectué (voir la note). Vous pouvez le marquer comme fait manuellement.", "Stripe refund not completed (see note). You can mark it as done manually."] };
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Retours et litiges", "Returns and disputes")}</h1>
      <p className="rounded-md border border-accent bg-accent/10 p-3 text-sm">{tr(locale, "L'administration arbitre : accepter ou refuser, puis rembourser le colis.", "The admin team arbitrates: accept or refuse, then refund the parcel.")}</p>
      {sp.ok && ok[sp.ok] && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, ...ok[sp.ok])}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{err[sp.error] ? tr(locale, ...err[sp.error]) : tr(locale, "Erreur.", "Error.")}</p>}
      <ListFilters locale={locale} path={path} q={q} tabs={tabs} defaultStatus="REQUESTED" />
      {list.length === 0 ? <p className="text-sm text-muted-foreground">{tr(locale, "Aucune demande de retour.", "No return request.")}</p> : (
        <ul className="divide-y rounded-lg border bg-card">
          {list.map((r) => (
            <li key={r.id} className="space-y-2 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{r.subOrder.number} · {eur(r.subOrder.subtotalCents)}</strong>
                <span className="text-muted-foreground">{fmt.format(r.createdAt)} · {returnLabel(r)[locale === "en" ? "en" : "fr"]}</span>
              </div>
              <p>{tr(locale, "Motif du client : ", "Customer reason: ")}{r.reason}</p>
              {parsePhotoIds(r.photoIds).length > 0 && <span className="flex flex-wrap gap-2 pt-1">{parsePhotoIds(r.photoIds).map((pid, i) => <a key={pid} href={`/api/media/${pid}`} target="_blank" rel="noreferrer" className="underline">{tr(locale, "Photo", "Photo")} {i + 1}</a>)}</span>}
              {r.condition && <p className="rounded-md border p-2">{tr(locale, "Contrôle du créateur : ", "Creator check: ")}<strong>{r.condition === "OK" ? tr(locale, "Conforme", "As expected") : tr(locale, "Endommagé / non conforme", "Damaged / not as expected")}</strong>{r.conditionNote ? ` — ${r.conditionNote}` : ""}{r.partnerReceivedAt ? ` (${fmt.format(r.partnerReceivedAt)})` : ""}</p>}
              {r.adminNote && <p className="text-muted-foreground">{tr(locale, "Note : ", "Note: ")}{r.adminNote}</p>}
              {r.refundNote && <p className="text-destructive">{r.refundNote}</p>}
              {r.status === "REQUESTED" && (
                <form action={decideReturnAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="text-xs">{tr(locale, "Note (facultatif)", "Note (optional)")}<input name="note" className={`${inputCls} w-64`} /></label>
                  <button name="decision" value="ACCEPTED" className={buttonVariants({ className: "min-h-11" })}>{tr(locale, "Accepter", "Accept")}</button>
                  <button name="decision" value="REFUSED" className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Refuser", "Refuse")}</button>
                </form>
              )}
              {r.partnerDecision && <p className={`rounded-md border p-2 ${r.partnerDecision === "REFUSED" ? "border-red-300 bg-red-50" : ""}`}>{r.partnerDecision === "ACCEPTED" ? tr(locale, "Le créateur a ACCEPTÉ le retour : remboursement à effectuer.", "The creator ACCEPTED the return: refund to be made.") : tr(locale, "Le créateur a REFUSÉ le retour (litige à arbitrer) : ", "The creator REFUSED the return (dispute to arbitrate): ")}{r.partnerDecisionNote ? ` ${r.partnerDecisionNote}` : ""}</p>}
              {(r.status === "ACCEPTED" || r.status === "RECEIVED") && (
                <div className="space-y-2">
                  {r.status === "ACCEPTED" && <form action={markReceivedAction}><input type="hidden" name="id" value={r.id} /><button className={buttonVariants({ className: "min-h-11" })}>{tr(locale, "Colis reçu (à la place du créateur)", "Parcel received (on behalf of creator)")}</button></form>}
                  <form action={refundReturnAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <StockChoice en={locale === "en"} defaultChoice={r.condition === "OK" ? "restock" : r.condition === "DAMAGED" ? "exclude" : ""} defaultReason={r.conditionNote ?? ""} />
                    <button className={buttonVariants({ className: "min-h-11" })}>{tr(locale, "Rembourser (Stripe)", "Refund (Stripe)")}</button>
                    <button name="manual" value="1" className={buttonVariants({ variant: "outline", className: "min-h-11 border-2 border-foreground/60" })}>{tr(locale, "Marquer remboursé (manuel)", "Mark refunded (manual)")}</button>
                  </form>
                  <p className="text-xs text-muted-foreground">{tr(locale, "Les frais de livraison ne sont pas remboursés.", "Delivery fees are not refunded.")}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pager locale={locale} path={path} q={q} total={total} defaultStatus="REQUESTED" />
    </>
  );
}
