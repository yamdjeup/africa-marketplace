import { notFound } from "next/navigation";
import { CARRIERS, cleanTrackingNumber } from "@/lib/tracking";
import { formatPhone } from "@/lib/phone";
import { Pill, inputCls } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { runSubOrderSweep } from "@/lib/order-notify";
import { subLabel } from "@/lib/suborders";
import { getPortalContext } from "@/lib/supplier";
import { tr } from "@/lib/tr";
import { acceptOrderAction, deliverOrderAction, prepareOrderAction, refuseOrderAction, shipOrderAction } from "../../../commandes-actions";

export const metadata = { title: "Commande", robots: { index: false } };

const ERR: Record<string, [string, string]> = {
  state: ["Cette commande a changé d'état (déjà traitée ou expirée).", "This order changed state (already handled or expired)."],
  reason: ["Merci d'indiquer un motif.", "Please give a reason."],
  tracking: ["Transporteur et numéro de suivi obligatoires.", "Carrier and tracking number are required."],
  stock: ["Stock insuffisant pour confirmer l'expédition.", "Not enough stock to confirm shipping."],
  readonly: ["Lecture seule en mode « voir comme ».", "Read-only in “view as” mode."],
};
const OK: Record<string, [string, string]> = {
  accepted: ["Commande acceptée. Le client est prévenu.", "Order accepted. The customer was notified."],
  refused: ["Commande refusée ; stock libéré, client prévenu.", "Order declined; stock released, customer notified."],
  preparing: ["Marquée en préparation ; client prévenu par e-mail.", "Marked as preparing; customer notified by e-mail."],
  shipped: ["Expédiée ; stock confirmé, client prévenu.", "Shipped; stock confirmed, customer notified."],
  delivered: ["Marquée livrée.", "Marked as delivered."],
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
  const o = sub.order;
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "long", timeStyle: "short" });
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
                <label className="block text-sm">{tr(locale, "Motif du refus", "Reason for declining")}<input name="reason" required minLength={3} className={inputCls} /></label>
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
              <select name="carrier" required className={inputCls} defaultValue="UPS">
                {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__other">{tr(locale, "Autre", "Other")}</option>
              </select>
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
      {sub.reason && ["REFUSED", "EXPIRED", "CANCELLED"].includes(sub.status) && <p className="text-sm text-muted-foreground">{tr(locale, "Motif : ", "Reason: ")}{sub.reason}</p>}
    </>
  );
}
