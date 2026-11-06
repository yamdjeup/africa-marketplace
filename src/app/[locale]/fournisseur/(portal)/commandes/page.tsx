import Link from "next/link";
import { Pill } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { runSubOrderSweep } from "@/lib/order-notify";
import { subLabel } from "@/lib/suborders";
import { getPortalContext } from "@/lib/supplier";
import { tr } from "@/lib/tr";

export const metadata = { title: "Commandes", robots: { index: false } };

const eur = (c: number, locale: Locale) => new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR" }).format(c / 100);
const FILTERS = [
  ["", "Toutes", "All", undefined],
  ["PENDING", "À accepter", "To accept", ["PENDING"]],
  ["TODO", "À expédier", "To ship", ["ACCEPTED", "PREPARING"]],
  ["SHIPPED", "Expédiées", "Shipped", ["SHIPPED"]],
  ["DONE", "Clôturées", "Closed", ["DELIVERED", "REFUSED", "EXPIRED", "CANCELLED"]],
] as const;

export default async function PartnerOrders({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ f?: string }> }) {
  const { locale } = await params;
  const { f = "" } = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  await runSubOrderSweep().catch(() => undefined);
  const statuses = FILTERS.find((x) => x[0] === f)?.[3];
  const subs = await db.subOrder.findMany({ where: { supplierId: ctx.supplier.id, ...(statuses ? { status: { in: [...statuses] } } : {}) }, include: { order: true }, orderBy: { createdAt: "desc" }, take: 100 });
  const base = `/${locale}/fournisseur/commandes`;
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium", timeStyle: "short" });
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Commandes", "Orders")}</h1>
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label={tr(locale, "Filtrer", "Filter")}>
        {FILTERS.map(([key, fr, en]) => (
          <Link key={key} href={key ? `${base}?f=${key}` : base} aria-current={f === key ? "page" : undefined} className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm ${f === key ? "border-accent bg-accent/15 font-semibold" : "text-muted-foreground"}`}>
            {tr(locale, fr, en)}
          </Link>
        ))}
      </nav>
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
    </>
  );
}
