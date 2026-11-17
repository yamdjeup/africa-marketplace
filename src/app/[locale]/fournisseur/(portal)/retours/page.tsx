import Link from "next/link";
import { ListFilters, Pager } from "@/components/admin/list-controls";
import { Pill } from "@/components/fournisseur/parts";
import type { ListParams } from "@/lib/admin-list";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { partnerReturnList } from "@/lib/partner-returns";
import { getPortalContext } from "@/lib/supplier";
import { tr } from "@/lib/tr";

export const metadata = { title: "Retours", robots: { index: false } };

export default async function PartnerReturns({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<ListParams> }) {
  const { locale } = await params;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { q, total, items, counts } = await partnerReturnList(db, ctx.supplier.id, await searchParams);
  const tabs = [
    { value: "todo", label: tr(locale, "À traiter", "To handle"), count: counts.todo },
    { value: "accepted", label: tr(locale, "Acceptés", "Accepted"), count: counts.accepted },
    { value: "refused", label: tr(locale, "Refusés", "Refused"), count: counts.refused },
    { value: "all", label: tr(locale, "Tous", "All"), count: counts.all },
  ];
  const base = `/${locale}/fournisseur/retours`;
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" });
  const stage = (s: string) => ({
    incoming: tr(locale, "Colis en route vers vous", "Parcel on its way to you"),
    decide: tr(locale, "Décision à prendre", "Decision needed"),
    accepted: tr(locale, "Accepté", "Accepted"),
    refused: tr(locale, "Refusé", "Refused"),
    refunded: tr(locale, "Remboursé", "Refunded"),
  })[s] ?? s;
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Retours", "Returns")}</h1>
      <ListFilters locale={locale} path={base} q={q} tabs={tabs} defaultStatus="todo" />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tr(locale, "Aucun retour.", "No returns.")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((r) => (
            <li key={r.id}>
              <Link href={`/${locale}/fournisseur/commandes/${r.subOrderId}`} className="flex min-h-16 flex-wrap items-center justify-between gap-2 p-3 hover:bg-muted/50">
                <span>
                  <span className="block font-medium">{r.number}</span>
                  <span className="block text-xs text-muted-foreground">{fmt.format(new Date(r.createdAt))} · {r.reason}</span>
                  {r.stage === "decide" && r.decideBy && <span className="block text-xs text-amber-800">{tr(locale, "Décision avant le ", "Decide before ")}{fmt.format(new Date(r.decideBy))}</span>}
                </span>
                <Pill cls={r.stage === "refused" ? "bg-red-100 text-red-900" : r.stage === "incoming" || r.stage === "decide" ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-900"}>{stage(r.stage)}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager locale={locale} path={base} q={q} total={total} defaultStatus="todo" />
    </>
  );
}
