import { Pill } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { subLabel } from "@/lib/suborders";
import { tr } from "@/lib/tr";

// Suivi client par boutique : « Vendu et expédié par [boutique] », état et suivi d'expédition réels.
export async function SubOrderTracking({ orderId, locale }: { orderId: string; locale: Locale }) {
  const subs = await db.subOrder.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
  if (subs.length === 0) return null;
  const shops = await db.supplier.findMany({ where: { id: { in: subs.map((s) => s.supplierId) } } });
  const items = await db.orderItem.findMany({ where: { subOrderId: { in: subs.map((s) => s.id) } } });
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "long" });
  return (
    <section aria-labelledby="by-shop" className="space-y-3">
      <h2 id="by-shop" className="font-heading text-xl">{tr(locale, "Suivi par boutique", "Tracking by shop")}</h2>
      {subs.map((s) => {
        const shop = shops.find((x) => x.id === s.supplierId);
        const st = subLabel(s.status);
        return (
          <div key={s.id} className="space-y-1 rounded-lg border p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {tr(locale, "Vendu et expédié par", "Sold and shipped by")} {shop?.displayName ?? "—"}
                {shop ? ` (${shop.country})` : ""}
              </p>
              <Pill cls={st.cls}>{locale === "en" ? st.en : st.fr}</Pill>
            </div>
            <ul className="text-muted-foreground">
              {items.filter((i) => i.subOrderId === s.id).map((i) => (
                <li key={i.id}>{i.quantity} × {i.name}{i.size ? ` (${i.size})` : ""}</li>
              ))}
            </ul>
            {s.status === "PENDING" && <p className="text-xs text-muted-foreground">{tr(locale, "En attente de la réponse de la boutique (48 h maximum).", "Waiting for the shop's reply (48 h maximum).")}</p>}
            {s.trackingNumber && <p>{tr(locale, "Expédiée le", "Shipped on")} {s.shippedAt ? fmt.format(s.shippedAt) : ""} — {s.carrier} · {tr(locale, "suivi", "tracking")} {s.trackingNumber}</p>}
            {s.deliveredAt && <p>{tr(locale, "Livrée le", "Delivered on")} {fmt.format(s.deliveredAt)}</p>}
            {s.reason && ["REFUSED", "CANCELLED"].includes(s.status) && <p>{tr(locale, "Motif : ", "Reason: ")}{s.reason}</p>}
            {["REFUSED", "EXPIRED", "CANCELLED"].includes(s.status) && <p className="text-xs">{tr(locale, "Commande annulée : aucun débit (paiement test).", "Order cancelled: no charge (test payment).")}</p>}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">{tr(locale, "E póm ta’ est l'intermédiaire ; la boutique est le vendeur.", "E póm ta’ is the marketplace intermediary; the shop is the seller.")}</p>
    </section>
  );
}
