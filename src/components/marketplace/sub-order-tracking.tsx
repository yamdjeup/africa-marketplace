import Link from "next/link";
import { Pill } from "@/components/fournisseur/parts";
import { CancelSubOrderButton } from "@/components/marketplace/cancel-sub-order-button";
import { ReturnRequestForm } from "@/components/marketplace/return-request-form";
import { db } from "@/lib/db";
import { RETURN_LABELS, returnEligibility, showShippedNotice, type ReturnStatus } from "@/lib/returns";
import type { Locale } from "@/lib/i18n";
import { subLabel } from "@/lib/suborders";
import { trackingUrl } from "@/lib/tracking";
import { tr } from "@/lib/tr";

// Suivi client par boutique : « Vendu et expédié par [boutique] », état et suivi d'expédition réels.
export async function SubOrderTracking({ orderId, locale, canCancel = false }: { orderId: string; locale: Locale; canCancel?: boolean }) {
  const subs = await db.subOrder.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
  if (subs.length === 0) return null;
  const shops = await db.supplier.findMany({ where: { id: { in: subs.map((s) => s.supplierId) } } });
  const items = await db.orderItem.findMany({ where: { subOrderId: { in: subs.map((s) => s.id) } } });
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "long" });
  const returns = await db.returnRequest.findMany({ where: { subOrderId: { in: subs.map((s) => s.id) } } });
  return (
    <section aria-labelledby="by-shop" className="space-y-3">
      <h2 id="by-shop" className="font-heading text-xl">{tr(locale, "Suivi par boutique", "Tracking by shop")}</h2>
      {subs.map((s, idx) => {
        const shop = shops.find((x) => x.id === s.supplierId);
        const st = subLabel(s.status);
        return (
          <div key={s.id} className="space-y-1 rounded-lg border p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide">{tr(locale, "Colis", "Parcel")} {idx + 1} {tr(locale, "sur", "of")} {subs.length}</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {tr(locale, "Vendu et expédié par", "Sold and shipped by")} {shop?.displayName ?? "—"}
                {shop ? ` (${shop.country})` : ""}
              </p>
              <Pill cls={st.cls}>{locale === "en" ? st.en : st.fr}</Pill>
            </div>
            <ul className="text-muted-foreground">
              {items.filter((i) => i.subOrderId === s.id).map((i) => (
                <li key={i.id}>{i.quantity} × <Link href={`/${locale}/produits/${i.productSlug}`} className="underline underline-offset-4">{i.name}</Link>{i.size ? ` (${i.size})` : ""}</li>
              ))}
            </ul>
            {s.status === "PENDING" && <p className="text-xs text-muted-foreground">{tr(locale, "En attente de la réponse de la boutique (48 h maximum).", "Waiting for the shop's reply (48 h maximum).")}</p>}
            {s.trackingNumber && <p>{tr(locale, "Expédiée le", "Shipped on")} {s.shippedAt ? fmt.format(s.shippedAt) : ""} — {s.carrier} · {tr(locale, "suivi", "tracking")} {s.trackingNumber}</p>}
            {s.trackingNumber && trackingUrl(s.carrier, s.trackingNumber) && <p><a href={trackingUrl(s.carrier, s.trackingNumber)!} target="_blank" rel="noopener noreferrer" className="font-medium underline">{tr(locale, "Suivre mon colis", "Track my parcel")}</a></p>}
            {s.deliveredAt && <p>{tr(locale, "Livrée le", "Delivered on")} {fmt.format(s.deliveredAt)}</p>}
            {s.reason && ["REFUSED", "CANCELLED"].includes(s.status) && <p>{tr(locale, "Motif : ", "Reason: ")}{s.reason}</p>}
            {["REFUSED", "EXPIRED", "CANCELLED"].includes(s.status) && (() => {
              const amt = new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR" }).format(s.subtotalCents / 100);
              const ok = ["DONE", "AWAITING", "REQUESTED"].includes(s.refundStatus);
              const msg = ok
                ? tr(locale, `Commande annulée : vous serez remboursé de ${amt} sur votre moyen de paiement sous 5 à 10 jours ouvrés.`, `Order cancelled: you will be refunded ${amt} to your payment method within 5 to 10 business days.`)
                : s.refundStatus === "FAILED"
                  ? tr(locale, "Commande annulée : nous revenons vers vous au sujet de votre remboursement.", "Order cancelled: we will get back to you about your refund.")
                  : tr(locale, "Commande annulée.", "Order cancelled.");
              return <p className="text-xs">{msg}</p>;
            })()}
            {canCancel && ["PENDING", "ACCEPTED", "PREPARING"].includes(s.status) && <CancelSubOrderButton id={s.id} locale={locale} />}
            {(() => {
              const ret = returns.find((r) => r.subOrderId === s.id);
              if (ret) return <p className="text-xs font-medium">{tr(locale, RETURN_LABELS[ret.status as ReturnStatus]?.fr ?? ret.status, RETURN_LABELS[ret.status as ReturnStatus]?.en ?? ret.status)}</p>;
              if (!canCancel || returnEligibility(s, false) !== "ok") return null;
              return <ReturnRequestForm id={s.id} locale={locale} />;
            })()}
            {canCancel && showShippedNotice(s.status, returns.some((r) => r.subOrderId === s.id)) && <p className="text-xs text-muted-foreground">{tr(locale, "Ce colis est expédié : il ne peut plus être annulé. Vous pouvez le retourner sous 30 jours après la livraison (voir Retours et remboursements).", "This parcel has shipped and can no longer be cancelled. You can return it within 30 days of delivery (see Returns and refunds).")}</p>}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">{tr(locale, "E póm ta’ est l'intermédiaire ; la boutique est le vendeur.", "E póm ta’ is the marketplace intermediary; the shop is the seller.")}</p>
    </section>
  );
}
