import Link from "next/link";
import { Pill } from "@/components/fournisseur/parts";
import { ListFilters, Pager } from "@/components/admin/list-controls";
import { PARTNER_SUB_FILTERS, pageArgs, pageCount, parseList, partnerSubOrdersWhere, type ListParams } from "@/lib/admin-list";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { runSubOrderSweep } from "@/lib/order-notify";
import { subLabel } from "@/lib/suborders";
import { getPortalContext } from "@/lib/supplier";
import { tr } from "@/lib/tr";

export const metadata = { title: "Commandes", robots: { index: false } };

const eur = (c: number, locale: Locale) => new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR" }).format(c / 100);
export default async function PartnerOrders({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<ListParams> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  await runSubOrderSweep().catch(() => undefined);
  const q = parseList(sp, PARTNER_SUB_FILTERS, "todo", ["createdAt"], "createdAt");
  const where = partnerSubOrdersWhere(q, ctx.supplier.id);
  const total = await db.subOrder.count({ where });
  q.page = Math.min(q.page, pageCount(total));
  const [subs, nTodo, nPending] = await Promise.all([
    db.subOrder.findMany({ where, include: { order: true }, orderBy: { createdAt: q.asc ? "asc" : "desc" }, ...pageArgs(q.page) }),
    db.subOrder.count({ where: partnerSubOrdersWhere({ ...q, q: "", from: null, to: null, st: "todo" }, ctx.supplier.id) }),
    db.subOrder.count({ where: { supplierId: ctx.supplier.id, status: "PENDING" } }),
  ]);
  const tabs = [{ value: "todo", label: tr(locale, "À traiter", "To handle"), count: nTodo }, { value: "PENDING", label: tr(locale, "À accepter", "To accept"), count: nPending }, { value: "ship", label: tr(locale, "À expédier", "To ship") }, { value: "SHIPPED", label: tr(locale, "Expédiées", "Shipped") }, { value: "done", label: tr(locale, "Clôturées", "Closed") }, { value: "all", label: tr(locale, "Toutes", "All") }];
  const base = `/${locale}/fournisseur/commandes`;
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium", timeStyle: "short" });
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Commandes", "Orders")}</h1>
      <ListFilters locale={locale} path={base} q={q} tabs={tabs} defaultStatus="todo" />
      {subs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tr(locale, "Aucune commande.", "No orders.")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {subs.map((s) => {
            const st = subLabel(s.status);
            return (
              <li key={s.id}>
                <Link href={`${base}/${s.id}`} className="flex min-h-16 flex-wrap items-center justify-between gap-2 p-3 hover:bg-muted/50">
                  <span>
                    <span className="block font-medium">{s.number}</span>
                    <span className="block text-xs text-muted-foreground">
                      {fmt.format(s.createdAt)} · {s.order.fullName} · {eur(s.subtotalCents, locale)}
                    </span>
                    {s.status === "PENDING" && <span className="block text-xs text-amber-800">{tr(locale, "À accepter avant le ", "Accept before ")}{fmt.format(s.acceptBy)}</span>}
                  </span>
                  <Pill cls={st.cls}>{locale === "en" ? st.en : st.fr}</Pill>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Pager locale={locale} path={base} q={q} total={total} defaultStatus="todo" />
    </>
  );
}
