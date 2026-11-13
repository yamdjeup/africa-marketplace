import Link from "next/link";
import { db } from "@/lib/db";
import { getPortalContext } from "@/lib/supplier";
import { tr } from "@/lib/tr";
import { MOVEMENT_LABELS } from "@/lib/stock";
import { StockFilters } from "@/components/marketplace/stock-filters";
import { journalOrder, journalWhere } from "@/lib/stock-journal";
import type { Locale } from "@/lib/i18n";
import { PAGE_SIZE } from "@/lib/admin-works";
import { StockListView } from "@/components/marketplace/stock-list-view";
import { loadStockList, STOCK_LIST_KEYS } from "@/lib/stock-list";

export const metadata = { title: "Stocks", robots: { index: false } };
export const dynamic = "force-dynamic";

type SP = Partial<Record<(typeof STOCK_LIST_KEYS)[number] | "sp", string>> & { p?: string; mp?: string; jd?: string; jq?: string; jt?: string; jfrom?: string; jto?: string; jwho?: string; jr?: string; jdir?: string };
const JKEYS = ["jd", "jq", "jt", "jfrom", "jto", "jwho", "jr", "jdir"] as const;

export default async function PartnerStocksPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const fr = locale !== "en";
  const mpage = Math.max(1, Math.trunc(Number(sp.mp)) || 1);
  const supplierId = ctx.supplier.id;
  const dtf = (d: Date) => d.toLocaleString(fr ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const list = await loadStockList(sp, [supplierId], fr);
  const own = await db.product.findMany({ where: { supplierId }, select: { slug: true, name: true, nameEn: true } });
  const titleOf = new Map(own.map((o) => [o.slug, fr ? o.name : o.nameEn]));
  const jsp = { d: sp.jd, q: sp.jq, t: sp.jt, from: sp.jfrom, to: sp.jto, who: sp.jwho, r: sp.jr, dir: sp.jdir };
  const jwhere = await journalWhere(jsp, own.map((o) => o.slug));
  const [moves, movesTotal] = await Promise.all([
    db.stockMovement.findMany({ where: jwhere, orderBy: journalOrder(jsp), skip: (mpage - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.stockMovement.count({ where: jwhere }),
  ]);
  const variantIds = [...new Set(moves.map((m) => m.variantId).filter((x): x is string => !!x))];
  const variantLabel = new Map((await db.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, label: true } })).map((v) => [v.id, v.label]));
  const mpages = Math.max(1, Math.ceil(movesTotal / PAGE_SIZE));
  const base = `/${locale}/fournisseur/stocks`;
  const href = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged: Record<string, string | undefined> = { ...sp, ...o };
    for (const k of ["mp", ...JKEYS, ...STOCK_LIST_KEYS]) if (merged[k]) u.set(k, merged[k]!);
    return `${base}?${u.toString()}`;
  };
  const pager = (cur: number, n: number, key: "p" | "mp") => (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-3 text-sm">
      {cur > 1 ? <Link className="underline" href={href({ [key]: String(cur - 1) })}>← {tr(locale, "Précédent", "Previous")}</Link> : <span className="text-muted-foreground">←</span>}
      <span>{tr(locale, "Page", "Page")} {cur} / {n}</span>
      {cur < n ? <Link className="underline" href={href({ [key]: String(cur + 1) })}>{tr(locale, "Suivant", "Next")} →</Link> : <span className="text-muted-foreground">→</span>}
    </nav>
  );

  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Stocks", "Stock")}</h1>
      <StockListView locale={locale} sp={sp} action={base} data={list} hidden={Object.fromEntries(JKEYS.map((k) => [k, sp[k]]).concat([["mp", sp.mp]]))} adjust={(s) => `/${locale}/fournisseur/oeuvres/${s}#stock`} />

      <section className="space-y-3">
        <h2 className="font-heading text-2xl text-primary">{tr(locale, "Journal des mouvements de stock", "Stock movement log")}</h2>
        <StockFilters pf="j" locale={locale} sp={jsp} action={base} hidden={Object.fromEntries(STOCK_LIST_KEYS.map((k) => [k, sp[k]]))} />
        {moves.length === 0 ? <p className="text-sm text-muted-foreground">{tr(locale, "Aucun mouvement.", "No movements.")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="border-b text-xs uppercase text-muted-foreground"><th className="py-2 pr-3">Date</th><th className="pr-3">{tr(locale, "Création", "Creation")}</th><th className="pr-3">{tr(locale, "Variante", "Variant")}</th><th className="pr-3">Type</th><th className="pr-3">{tr(locale, "Qté", "Qty")}</th><th className="pr-3">{tr(locale, "Motif", "Reason")}</th><th>{tr(locale, "Auteur", "Author")}</th></tr></thead>
              <tbody>{moves.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="whitespace-nowrap py-2 pr-3">{dtf(m.createdAt)}</td>
                  <td className="pr-3">{titleOf.get(m.productSlug) ?? m.productSlug}</td>
                  <td className="pr-3">{(m.variantId && variantLabel.get(m.variantId)) || "—"}</td>
                  <td className="pr-3">{MOVEMENT_LABELS[m.type as keyof typeof MOVEMENT_LABELS]?.[fr ? "fr" : "en"] ?? m.type}</td>
                  <td className="pr-3">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                  <td className="pr-3">{m.reason}</td><td>{m.authorLabel}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
        {pager(Math.min(mpage, mpages), mpages, "mp")}
      </section>
    </>
  );
}
