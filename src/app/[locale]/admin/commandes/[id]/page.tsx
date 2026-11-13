import { cleanTrackingNumber } from "@/lib/tracking";
import Link from "next/link";
import { formatPhone } from "@/lib/phone";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/admin/table-widgets";
import { Pill } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { MOVEMENT_LABELS } from "@/lib/stock";
import { isOpenStatus, subLabel } from "@/lib/suborders";
import { tr } from "@/lib/tr";
import { adminCancelSubOrder } from "../../commandes-actions";

export const metadata = { title: "Détail de commande (admin)", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const fr = locale !== "en";
  const sub = await db.subOrder.findUnique({ where: { id }, include: { order: true } });
  if (!sub) notFound();
  const [items, shop, moves] = await Promise.all([
    db.orderItem.findMany({ where: { subOrderId: sub.id } }),
    db.supplier.findUnique({ where: { id: sub.supplierId }, select: { displayName: true } }),
    db.stockMovement.findMany({ where: { orderNumber: { in: [sub.number, sub.order.number] } }, orderBy: { createdAt: "asc" } }),
  ]);
  const o = sub.order;
  const st = subLabel(sub.status);
  const dtf = (d: Date | null) => (d ? d.toLocaleString(fr ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null);
  const eur = (c: number) => new Intl.NumberFormat(fr ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(c / 100);
  const history = [
    [tr(locale, "Commande passée", "Order placed"), sub.createdAt],
    [sub.status === "CANCELLED" ? tr(locale, `Commande annulée par l'administration${sub.reason ? ` — motif : ${sub.reason}` : ""}`, `Order cancelled by admin${sub.reason ? ` — reason: ${sub.reason}` : ""}`) : tr(locale, "Réponse du partenaire", "Partner decision"), sub.decidedAt],
    [tr(locale, "Expédiée", "Shipped"), sub.shippedAt],
    [tr(locale, "Livrée", "Delivered"), sub.deliveredAt],
  ].filter((h): h is [string, Date] => !!h[1]);

  return (
    <>
      <Link href={`/${locale}/admin/commandes`} className="text-sm underline">← {tr(locale, "Retour aux commandes", "Back to orders")}</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl text-primary">{sub.number}</h1>
        <Pill cls={st.cls}>{fr ? st.fr : st.en}</Pill>
      </div>
      <p className="text-sm text-muted-foreground">{tr(locale, "Partenaire", "Partner")} : {shop?.displayName ?? "—"} · {tr(locale, "Commande client", "Customer order")} {o.number}</p>

      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="font-heading text-xl">{tr(locale, "Articles", "Items")}</h2>
        <ul className="space-y-1 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>{i.quantity} × {i.name}{i.size ? ` — ${tr(locale, "taille / variante", "size / variant")} : ${i.size}` : ""}</span>
              <span>{eur(i.unitPriceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t pt-2 font-semibold"><span>{tr(locale, "Sous-total partenaire", "Partner subtotal")}</span><span>{eur(sub.subtotalCents)}</span></p>
      </section>

      <section className="space-y-1 rounded-lg border p-4 text-sm">
        <h2 className="font-heading text-xl">{tr(locale, "Client et livraison", "Customer and delivery")}</h2>
        <p>{o.fullName} · <a className="underline" href={`mailto:${o.email}`}>{o.email}</a></p>
        <p>{o.address}, {o.postalCode} {o.city}, {o.country}</p>
        <p>{tr(locale, "Téléphone", "Phone")} : {o.phone ? <a className="underline" href={`tel:${o.phone}`}>{formatPhone(o.phone)}</a> : "—"}</p>
        <p>{tr(locale, "Suivi", "Tracking")} : {sub.trackingNumber ? `${sub.carrier} ${cleanTrackingNumber(sub.trackingNumber)}` : "—"}</p>
        {sub.reason && <p>{tr(locale, "Motif", "Reason")} : {sub.reason}</p>}
      </section>

      <section className="space-y-1 rounded-lg border p-4 text-sm">
        <h2 className="font-heading text-xl">{tr(locale, "Historique", "History")}</h2>
        <ul className="space-y-1">{history.map(([l, d]) => <li key={l}>{dtf(d)} — {l}</li>)}</ul>
      </section>

      <section className="space-y-2 rounded-lg border p-4 text-sm">
        <h2 className="font-heading text-xl">{tr(locale, "Mouvements de stock liés", "Linked stock movements")}</h2>
        {moves.length === 0 ? <p className="text-muted-foreground">{tr(locale, "Aucun mouvement.", "No movements.")}</p> : (
          <ul className="space-y-1">{moves.map((m) => <li key={m.id}>{dtf(m.createdAt)} — {MOVEMENT_LABELS[m.type as keyof typeof MOVEMENT_LABELS]?.[fr ? "fr" : "en"] ?? m.type} {m.quantity > 0 ? `+${m.quantity}` : m.quantity} ({m.productSlug})</li>)}</ul>
        )}
      </section>

      {isOpenStatus(sub.status) && sub.status !== "SHIPPED" && (
        <form action={adminCancelSubOrder} className="flex flex-wrap items-end gap-2 rounded-lg border p-4">
          <input type="hidden" name="id" value={sub.id} />
          <ConfirmButton askReason en={!fr} title={tr(locale, "Annuler cette commande ?", "Cancel this order?")} message={tr(locale, "Le stock sera libéré et le client prévenu.", "Stock will be released and the customer notified.")} className="inline-flex min-h-11 items-center rounded-md border border-destructive px-3 text-sm text-destructive">{tr(locale, "Annuler et libérer le stock", "Cancel and release stock")}</ConfirmButton>
        </form>
      )}
    </>
  );
}
