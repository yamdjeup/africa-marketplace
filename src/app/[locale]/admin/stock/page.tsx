import Link from "next/link";
import { loadAdminStock, type AdminStockParams } from "@/lib/admin-stock";
import { MOVEMENT_LABELS } from "@/lib/stock";
import type { Locale } from "@/lib/i18n";
import { StockFilters } from "@/components/marketplace/stock-filters";
import { JOURNAL_KEYS } from "@/lib/stock-journal";
import { tr } from "@/lib/tr";
import { StockListView } from "@/components/marketplace/stock-list-view";
import { loadStockList, STOCK_LIST_KEYS } from "@/lib/stock-list";

export const dynamic = "force-dynamic";
type SP = AdminStockParams & Partial<Record<(typeof STOCK_LIST_KEYS)[number], string>>;

export default async function AdminStockJournal({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const fr = locale !== "en";
  const page = Math.max(1, Math.trunc(Number(sp.p)) || 1);
  const { sups, rows, total, prodOf, vlabel, supName, pages } = await loadAdminStock(sp, fr);
  const list = await loadStockList(sp, sups.map((s) => s.id), fr);
  const jhidden = Object.fromEntries(JOURNAL_KEYS.map((k) => [k, sp[k]]));
  const lhidden = Object.fromEntries(STOCK_LIST_KEYS.map((k) => [k, sp[k]]));
  const href = (p: number) => {
    const u = new URLSearchParams();
    for (const k of [...JOURNAL_KEYS, ...STOCK_LIST_KEYS]) if (sp[k]) u.set(k, sp[k]!);
    u.set("p", String(p));
    return `/${locale}/admin/stock?${u.toString()}`;
  };
  const dtf = (d: Date) => d.toLocaleString(fr ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="space-y-4">
      <Link href={`/${locale}/admin/fournisseurs`} className="text-sm underline">← {tr(locale, "Partenaires", "Partners")}</Link>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Stocks", "Stock")}</h1>
      <section className="space-y-2">
        <h2 className="font-heading text-2xl text-primary">{tr(locale, "Stock par création", "Stock by creation")}</h2>
        <StockListView locale={locale} sp={sp} action={`/${locale}/admin/stock`} data={list} hidden={jhidden} partner={sups} supName={supName} />
      </section>
      <h2 className="font-heading text-2xl text-primary">{tr(locale, "Journal des mouvements de stock", "Stock movement log")}</h2>      <StockFilters locale={locale} sp={sp} action={`/${locale}/admin/stock`} partner={sups} hidden={lhidden} />
      <p className="text-sm text-muted-foreground">{total} {tr(locale, "mouvement(s)", "movement(s)")}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead><tr className="border-b text-xs uppercase text-muted-foreground"><th className="py-2 pr-3">Date</th><th className="pr-3">{tr(locale, "Création", "Creation")}</th><th className="pr-3">Type</th><th className="pr-3">{tr(locale, "Qté", "Qty")}</th><th className="pr-3">{tr(locale, "Motif", "Reason")}</th><th>{tr(locale, "Auteur", "Author")}</th></tr></thead>
          <tbody>{rows.map((m) => (
            <tr key={m.id} className="border-b">
              <td className="whitespace-nowrap py-2 pr-3">{dtf(m.createdAt)}</td>
              <td className="pr-3"><Link href={`/${locale}/produits/${m.productSlug}`} className="underline-offset-2 hover:underline">{(fr ? prodOf.get(m.productSlug)?.name : prodOf.get(m.productSlug)?.nameEn) ?? m.productSlug}</Link>{(m.variantId && vlabel.get(m.variantId)) ? <span className="text-muted-foreground"> · {vlabel.get(m.variantId)}</span> : null}{prodOf.get(m.productSlug) ? <span className="block text-xs text-muted-foreground">{supName.get(prodOf.get(m.productSlug)!.supplierId ?? "") ?? ""}</span> : null}</td>
              <td className="pr-3">{MOVEMENT_LABELS[m.type as keyof typeof MOVEMENT_LABELS]?.[fr ? "fr" : "en"] ?? m.type}</td>
              <td className="pr-3">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
              <td className="pr-3">{m.reason}</td><td>{m.authorLabel}</td>
            </tr>))}</tbody>
        </table>
      </div>
      <nav aria-label="Pagination" className="flex items-center gap-3 text-sm">
        {page > 1 ? <Link className="underline" href={href(page - 1)}>← {tr(locale, "Précédent", "Previous")}</Link> : <span className="text-muted-foreground">←</span>}
        <span>Page {Math.min(page, pages)} / {pages}</span>
        {page < pages ? <Link className="underline" href={href(page + 1)}>{tr(locale, "Suivant", "Next")} →</Link> : <span className="text-muted-foreground">→</span>}
      </nav>
    </div>
  );
}
