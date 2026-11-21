import { notFound } from "next/navigation";
import { CARRIERS, cleanTrackingNumber } from "@/lib/tracking";
import { activeCarrierNames, sortCarriers } from "@/lib/config-lists";
import { formatPhone } from "@/lib/phone";
import { Pill, inputCls } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { runSubOrderSweep } from "@/lib/order-notify";
import { subLabel } from "@/lib/suborders";
import { returnLabel, partnerCheckDeadline } from "@/lib/returns";
import { listReasons } from "@/lib/refusal-reasons";
import { getPortalContext } from "@/lib/supplier";
import { tr } from "@/lib/tr";
import { parsePhotoIds } from "@/lib/return-photos";
import { acceptOrderAction, deliverOrderAction, prepareOrderAction, refuseOrderAction, returnArrivedAction, returnCheckAction, returnDecideAction, shipOrderAction } from "../../../commandes-actions";
import { ConfirmSubmit } from "@/components/fournisseur/confirm-submit";

export const metadata = { title: "Commande", robots: { index: false } };

const ERR: Record<string, [string, string]> = {
  state: ["Cette commande a changé d'état (déjà traitée ou expirée).", "This order changed state (already handled or expired)."],
  reason: ["Merci d'indiquer un motif.", "Please give a reason."],
  tracking: ["Transporteur et numéro de suivi obligatoires.", "Carrier and tracking number are required."],
  stock: ["Stock insuffisant pour confirmer l'expédition.", "Not enough stock to confirm shipping."],
  note: ["Un commentaire est obligatoire si le colis est endommagé.", "A comment is required when the parcel is damaged."],
  readonly: ["Lecture seule en mode « voir comme ».", "Read-only in “view as” mode."],
};
const OK: Record<string, [string, string]> = {
  accepted: ["Commande acceptée. Le client est prévenu.", "Order accepted. The customer was notified."],
  refused: ["Commande refusée ; stock libéré, client prévenu.", "Order declined; stock released, customer notified."],
  preparing: ["Marquée en préparation ; client prévenu par e-mail.", "Marked as preparing; customer notified by e-mail."],
  shipped: ["Expédiée ; stock confirmé, client prévenu.", "Shipped; stock confirmed, customer notified."],
  delivered: ["Marquée livrée.", "Marked as delivered."],
  returnchecked: ["Réception enregistrée ; E póm ta’ rembourse le client.", "Receipt recorded; E póm ta’ will refund the customer."],
  returnarrived: ["Réception du colis enregistrée : contrôlez maintenant son état.", "Parcel receipt recorded: now check its condition."],
};

export default async function PartnerOrder({ params, searchParams }: { params: Promise<{ locale: Locale; id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  await runSubOrderSweep().catch(() => undefined);
  // Autorisation : une sous-commande n'est visible que par son partenaire propriétaire.
  const sub = await db.subOrder.findFirst({ where: { id, supplierId: ctx.supplier.id }, include: { order: true } });
  if (!sub) notFound();
  const items = await db.orderItem.findMany({ where: { subOrderId: sub.id } });
  const st = subLabel(sub.status);
  const ret = await db.returnRequest.findFirst({ where: { subOrderId: sub.id } });
  const [orderReasons, returnReasons, carrierNames] = await Promise.all([listReasons(db, "ORDER"), listReasons(db, "RETURN"), activeCarrierNames(db, CARRIERS)]);
  const o = sub.order;
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" });
  const eur = (c: number) => new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR" }).format(c / 100);
  const ro = ctx.viewingAs;
  const hidden = (
    <>
      <input type="hidden" name="id" value={sub.id} />
      <input type="hidden" name="locale" value={locale} />
    </>
  );
  const btn = "inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground";
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl text-primary">{tr(locale, "Commande", "Order")} {sub.number}</h1>
        <Pill cls={st.cls}>{locale === "en" ? st.en : st.fr}</Pill>
      </div>
      {sp.ok && OK[sp.ok] && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, ...OK[sp.ok])}</p>}
      {sp.error && ERR[sp.error] && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{tr(locale, ...ERR[sp.error])}</p>}

      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="font-heading text-xl">{tr(locale, "Articles", "Items")}</h2>
        <ul className="space-y-1 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>{i.quantity} × {i.name}{i.size ? ` (${i.size})` : ""}</span>
              <span>{eur(i.unitPriceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t pt-2 font-semibold"><span>{tr(locale, "Total boutique", "Shop total")}</span><span>{eur(sub.subtotalCents)}</span></p>
        <p className="text-xs text-muted-foreground">{tr(locale, "Passée le", "Placed on")} {fmt.format(sub.createdAt)}</p>
      </section>

      <section className="space-y-1 rounded-lg border p-4 text-sm">
        <h2 className="font-heading text-xl">{tr(locale, "Livrer à", "Ship to")}</h2>
        <p>{o.fullName}</p>
        <p>{o.address}, {o.postalCode} {o.city}, {o.country}</p>
        {o.phone && <p>{formatPhone(o.phone)}</p>}
      </section>

      {sub.status === "PENDING" && (
        <section className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm">{tr(locale, "À accepter avant le ", "Accept before ")}<strong>{fmt.format(sub.acceptBy)}</strong>{tr(locale, " — sans réponse, la commande est annulée automatiquement et le stock libéré.", " — otherwise the order is cancelled automatically and stock released.")}</p>
          {!ro && (
            <div className="grid gap-4 sm:grid-cols-2">
              <form action={acceptOrderAction}>{hidden}<button className={btn} type="submit">{tr(locale, "Accepter la commande", "Accept order")}</button></form>
              <form action={refuseOrderAction} className="space-y-2">
                {hidden}
                <label className="block text-sm">{tr(locale, "Motif du refus", "Reason for declining")}
                  <select name="reasonId" required defaultValue="" className={inputCls}>
                    <option value="" disabled>{tr(locale, "Choisir un motif", "Choose a reason")}</option>
                    {orderReasons.map((r) => <option key={r.id} value={r.id}>{locale === "en" ? r.en : r.fr}</option>)}
                  </select>
                </label>
                <label className="block text-sm">{tr(locale, "Précision (facultative, visible uniquement par l'administration)", "Details (optional, visible to the administration only)")}<input name="note" maxLength={500} className={inputCls} /></label>
                <button className="inline-flex min-h-11 items-center rounded-md border border-destructive px-4 text-sm text-destructive" type="submit">{tr(locale, "Refuser", "Decline")}</button>
              </form>
            </div>
          )}
        </section>
      )}

      {(sub.status === "ACCEPTED" || sub.status === "PREPARING") && !ro && (
        <section className="space-y-4 rounded-lg border p-4">
          {sub.status === "ACCEPTED" && <form action={prepareOrderAction}>{hidden}<button className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm" type="submit">{tr(locale, "Marquer en préparation", "Mark as preparing")}</button></form>}
          <form action={shipOrderAction} className="grid gap-3 sm:grid-cols-2">
            {hidden}
            <label className="block text-sm">{tr(locale, "Transporteur", "Carrier")}
              <input name="carrier" required list="carrier-list" autoComplete="off" maxLength={80} defaultValue="UPS" placeholder={tr(locale, "Tapez pour filtrer…", "Type to filter…")} className={inputCls} />
              <datalist id="carrier-list">
                {sortCarriers(carrierNames).map((c) => <option key={c} value={c} />)}
                <option value="Autre" />
              </datalist>
            </label>
            <label className="block text-sm">{tr(locale, "Autre transporteur (si « Autre »)", "Other carrier (if “Other”)")}<input name="carrierOther" maxLength={80} className={inputCls} /></label>
            <label className="block text-sm">{tr(locale, "Numéro de suivi", "Tracking number")}<input name="tracking" required className={inputCls} /></label>
            <div className="sm:col-span-2"><button className={btn} type="submit">{tr(locale, "Marquer expédiée", "Mark as shipped")}</button></div>
          </form>
        </section>
      )}

      {sub.status === "SHIPPED" && (
        <section className="space-y-3 rounded-lg border p-4 text-sm">
          <p>{tr(locale, "Expédiée le", "Shipped on")} {sub.shippedAt ? fmt.format(sub.shippedAt) : ""} — {sub.carrier} · {cleanTrackingNumber(sub.trackingNumber)}</p>
          {!ro && <form action={deliverOrderAction}>{hidden}<button className={btn} type="submit">{tr(locale, "Marquer livrée", "Mark as delivered")}</button></form>}
        </section>
      )}
      {ret && <p className="rounded-md border p-3 text-sm"><strong>{returnLabel(ret)[locale === "en" ? "en" : "fr"]}</strong> · {tr(locale, "Motif du client : ", "Customer reason: ")}{ret.reason}<br />{parsePhotoIds(ret.photoIds).length > 0 && <span className="flex flex-wrap gap-2 pt-1">{parsePhotoIds(ret.photoIds).map((pid, i) => <a key={pid} href={`/api/media/${pid}`} target="_blank" rel="noreferrer" className="underline">{tr(locale, "Photo", "Photo")} {i + 1}</a>)}</span>}<span className="text-muted-foreground">{tr(locale, "L'administration rembourse après votre décision et arbitre les litiges.", "The administration refunds after your decision and arbitrates disputes.")}</span></p>}
      {(ret?.status === "ACCEPTED" || (ret?.status === "RECEIVED" && !ret.condition && !ret.partnerDecision)) && (
        <section className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          {ret.status === "RECEIVED" ? <p><strong>{tr(locale, "Colis reçu — à contrôler", "Parcel received — to check")}</strong> — {tr(locale, "contrôlez-le et décidez sous 6 jours calendaires.", "check it and decide within 6 calendar days.")}</p> : <p><strong>{tr(locale, "Colis en route vers vous", "Parcel on its way to you")}</strong> — {tr(locale, "le client vous renvoie ce colis. À réception, contrôlez-le et décidez sous 6 jours calendaires.", "the customer is sending this parcel back to you. On arrival, check it and decide within 6 calendar days.")}</p>}
          {!ro && ret.status === "ACCEPTED" && ret.returnShippedAt && (
            <form action={returnArrivedAction}>
              {hidden}
              <ConfirmSubmit className={btn} message={tr(locale, "Confirmer que vous avez bien reçu ce colis retour ? Le client sera prévenu.", "Confirm that you have received this returned parcel? The customer will be notified.")}>{tr(locale, "J'ai reçu le colis", "I received the parcel")}</ConfirmSubmit>
            </form>
          )}
          {!ro && !(ret.status === "ACCEPTED" && ret.returnShippedAt) && (
            <form action={returnCheckAction} className="grid gap-3 sm:grid-cols-2">
              {hidden}
              <label className="block">{tr(locale, "État du colis reçu", "Condition of the parcel")}
                <select name="condition" required className={inputCls} defaultValue="OK">
                  <option value="OK">{tr(locale, "Conforme (remise en vente)", "As expected (back on sale)")}</option>
                  <option value="DAMAGED">{tr(locale, "Endommagé / exclure du stock", "Damaged / exclude from stock")}</option>
                </select>
              </label>
              <label className="block">{tr(locale, "Commentaire (obligatoire si endommagé)", "Comment (required if damaged)")}<input name="note" maxLength={300} className={inputCls} /></label>
              <div className="sm:col-span-2"><button className={btn} type="submit">{tr(locale, "Confirmer la réception", "Confirm receipt")}</button></div>
            </form>
          )}
        </section>
      )}
      {ret?.status === "RECEIVED" && ret.condition && ret.partnerReceivedAt && <p className="rounded-md border p-3 text-sm">{tr(locale, "Réception confirmée le ", "Receipt confirmed on ")}{fmt.format(ret.partnerReceivedAt)} — {ret.condition === "DAMAGED" ? tr(locale, "endommagé", "damaged") : tr(locale, "conforme", "as expected")}{ret.conditionNote ? ` : ${ret.conditionNote}` : ""}. {!ret.partnerDecision && <>{tr(locale, "Décision attendue avant le ", "Decision expected before ")}{fmt.format(partnerCheckDeadline(ret.partnerReceivedAt))}{tr(locale, " : acceptez ou refusez le retour ci-dessous.", ": accept or refuse the return below.")}</>}</p>}
      {ret?.status === "RECEIVED" && ret.condition && !ret.partnerDecision && !ro && (
        <section className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <p><strong>{tr(locale, "Votre décision sur ce retour", "Your decision on this return")}</strong> — {tr(locale, "Accepté : l'administration est invitée à rembourser le client. Refusé : motif obligatoire ; l'administration arbitre le litige.", "Accepted: the administration is asked to refund the customer. Refused: a reason is required; the administration arbitrates the dispute.")}</p>
          <form action={returnDecideAction} className="grid gap-3 sm:grid-cols-2">
            {hidden}
            <label className="block">{tr(locale, "Décision", "Decision")}
              <select name="decision" required className={inputCls} defaultValue="ACCEPTED">
                <option value="ACCEPTED">{tr(locale, "Accepter le retour", "Accept the return")}</option>
                <option value="REFUSED">{tr(locale, "Refuser le retour", "Refuse the return")}</option>
              </select>
            </label>
            <label className="block">{tr(locale, "Motif du refus (obligatoire si refus)", "Reason for refusal (required if refused)")}
              <select name="reasonId" defaultValue="" className={inputCls}>
                <option value="">{tr(locale, "—", "—")}</option>
                {returnReasons.map((r) => <option key={r.id} value={r.id}>{locale === "en" ? r.en : r.fr}</option>)}
              </select>
            </label>
            <label className="block">{tr(locale, "Précision (facultative, visible uniquement par l'administration)", "Details (optional, visible to the administration only)")}<input name="note" maxLength={500} className={inputCls} /></label>
            <div className="sm:col-span-2"><button className={btn} type="submit">{tr(locale, "Valider ma décision", "Confirm my decision")}</button></div>
          </form>
        </section>
      )}
      {ret?.partnerDecision && <p className="rounded-md border p-3 text-sm"><strong>{ret.partnerDecision === "ACCEPTED" ? tr(locale, "Retour accepté par vous", "Return accepted by you") : tr(locale, "Retour refusé par vous", "Return refused by you")}</strong>{ret.partnerDecisionNote ? ` : ${ret.partnerDecisionNote}` : ""} — {ret.partnerDecision === "ACCEPTED" ? tr(locale, "remboursement à effectuer par l'administration.", "refund to be made by the administration.") : tr(locale, "litige arbitré par l'administration.", "dispute arbitrated by the administration.")}</p>}
      {sub.reason && ["REFUSED", "EXPIRED", "CANCELLED"].includes(sub.status) && <p className="text-sm text-muted-foreground">{tr(locale, "Motif : ", "Reason: ")}{sub.reason}</p>}
    </>
  );
}
