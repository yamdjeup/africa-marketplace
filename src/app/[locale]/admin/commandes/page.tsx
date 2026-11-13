import { cleanTrackingNumber } from "@/lib/tracking";
import { ConfirmButton } from "@/components/admin/table-widgets";
import { Pill } from "@/components/fournisseur/parts";
import Link from "next/link";
import { ListFilters, Pager } from "@/components/admin/list-controls";
import { SUB_STATUSES, has, pageArgs, pageCount, parseList, subOrdersWhere, type ListParams } from "@/lib/admin-list";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { runSubOrderSweep } from "@/lib/order-notify";
import { isOpenStatus, subLabel } from "@/lib/suborders";
import { tr } from "@/lib/tr";
import { adminCancelSubOrder } from "../commandes-actions";

export const metadata = { title: "Commandes (admin)", robots: { index: false } };

export default async function AdminOrders({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<ListParams & { ok?: string; error?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  await runSubOrderSweep().catch(() => undefined);
  const q = parseList(sp, SUB_STATUSES, "todo", ["createdAt"], "createdAt");
  const matched = q.q ? await db.supplier.findMany({ where: { displayName: has(q.q) }, select: { id: true }, take: 50 }) : [];
  const where = subOrdersWhere(q, matched.map((m) => m.id));
  const total = await db.subOrder.count({ where });
  q.page = Math.min(q.page, pageCount(total));
  const [subs, nTodo] = await Promise.all([
    db.subOrder.findMany({ where, include: { order: true }, orderBy: [{ createdAt: q.asc ? "asc" : "desc" }], ...pageArgs(q.page) }),
    db.subOrder.count({ where: subOrdersWhere({ ...q, q: "", from: null, to: null, st: "todo" }) }),
  ]);
  const orphans = q.st === "all" && !q.q && q.page === 1 ? await db.order.findMany({ where: { subOrders: { none: {} }, archivedAt: null }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 25 }) : [];
  const shops = await db.supplier.findMany({ where: { id: { in: [...new Set(subs.map((s) => s.supplierId))] } } });
  const path = `/${locale}/admin/commandes`;
  const tabs = [{ value: "todo", label: tr(locale, "À traiter", "To handle"), count: nTodo }, { value: "open", label: tr(locale, "En cours", "In progress") }, { value: "SHIPPED", label: tr(locale, "Expédiées", "Shipped") }, { value: "DELIVERED", label: tr(locale, "Livrées", "Delivered") }, { value: "closed", label: tr(locale, "Annulées / refusées", "Cancelled / refused") }, { value: "all", label: tr(locale, "Toutes", "All") }];
  const name = new Map(shops.map((s) => [s.id, s.displayName]));
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium", timeStyle: "short" });
  const eur = (c: number) => new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR" }).format(c / 100);
  const late = (s: (typeof subs)[number]) => s.status === "PENDING" && s.escalatedAt;
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Commandes par partenaire", "Orders by partner")}</h1>
      {sp.ok && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, "Commande annulée, stock libéré, client prévenu.", "Order cancelled, stock released, customer notified.")}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{tr(locale, "Action impossible (motif requis ou état changé).", "Not possible (reason required or state changed).")}</p>}
      <ListFilters locale={locale} path={path} q={q} tabs={tabs} defaultStatus="todo" />
      {subs.length === 0 && orphans.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tr(locale, "Aucune commande.", "No orders.")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {subs.map((s) => {
            const st = subLabel(s.status);
            return (
              <li key={s.id} className="space-y-2 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/${locale}/admin/commandes/${s.id}`} className="font-medium underline-offset-4 hover:underline">{s.number} · {name.get(s.supplierId) ?? "—"} ›</Link>
                  <span className="flex gap-2">
                    {late(s) && <Pill cls="bg-red-100 text-red-900">{tr(locale, "Sans réponse (escalade)", "No reply (escalated)")}</Pill>}
                    <Pill cls={st.cls}>{locale === "en" ? st.en : st.fr}</Pill>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fmt.format(s.createdAt)} · {s.order.fullName} · {eur(s.subtotalCents)}
                  {s.status === "PENDING" ? ` · ${tr(locale, "échéance", "due")} ${fmt.format(s.acceptBy)}` : ""}
                  {s.trackingNumber ? ` · ${s.carrier} ${cleanTrackingNumber(s.trackingNumber)}` : ""}
                </p>
                {isOpenStatus(s.status) && s.status !== "SHIPPED" && (
                  <form action={adminCancelSubOrder} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <ConfirmButton askReason en={locale === "en"} title={tr(locale, "Annuler cette commande ?", "Cancel this order?")} message={tr(locale, "Le stock sera libéré et le client prévenu.", "Stock will be released and the customer notified.")} className="inline-flex min-h-11 items-center rounded-md border border-destructive px-3 text-sm text-destructive">{tr(locale, "Annuler et libérer le stock", "Cancel and release stock")}</ConfirmButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Pager locale={locale} path={path} q={q} total={total} defaultStatus="todo" />
      {orphans.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-heading text-xl">{tr(locale, "Commandes sans partenaire (créations d'exemple)", "Orders without partner (sample creations)")}</h2>
          <p className="text-xs text-muted-foreground">{tr(locale, "Aucun partenaire à notifier : ces commandes n'ont pas de sous-commande.", "No partner to notify: these orders have no sub-order.")}</p>
          <ul className="divide-y rounded-lg border">
            {orphans.map((o) => (
              <li key={o.id} className="space-y-1 p-3 text-sm">
                <p className="font-medium">{o.number} · {fmt.format(o.createdAt)} · {eur(o.totalCents)}</p>
                <p className="text-xs text-muted-foreground">{o.fullName} · {o.email}</p>
                <p className="text-xs">{o.items.map((i) => `${i.quantity} × ${i.name}${i.size ? ` (${i.size})` : ""}`).join(", ")}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
