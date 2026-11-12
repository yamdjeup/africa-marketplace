import Link from "next/link";
import { Pill } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import { getPortalContext } from "@/lib/supplier";
import { tr } from "@/lib/tr";
import { MOVEMENT_LABELS } from "@/lib/stock";
import { StockFilters } from "@/components/marketplace/stock-filters";
import { journalOrder, journalWhere } from "@/lib/stock-journal";
import type { Locale } from "@/lib/i18n";
import { PAGE_SIZE } from "@/lib/admin-works";
import { availOf, queryPartnerWorks } from "@/lib/partner-works";

export const metadata = { title: "Stocks", robots: { index: false } };
export const dynamic = "force-dynamic";

type SP = { f?: string; p?: string; mp?: string; jd?: string; jq?: string; jt?: string; jfrom?: string; jto?: string; jwho?: string; jr?: string; jdir?: string };
const JKEYS = ["jd", "jq", "jt", "jfrom", "jto", "jwho", "jr", "jdir"] as const;
const VIEWS: [string, string, string][] = [["all", "Toutes", "All"], ["low", "Stock bas", "Low stock"], ["out", "Épuisées", "Sold out"]];

export default async function PartnerStocksPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const fr = locale !== "en";
  const view = VIEWS.some((v) => v[0] === sp.f) ? sp.f! : "all";
  const page = Math.max(1, Math.trunc(Number(sp.p)) || 1);
  const mpage = Math.max(1, Math.trunc(Number(sp.mp)) || 1);
  const supplierId = ctx.supplier.id;
  const dtf = (d: Date) => d.toLocaleString(fr ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const { list, total, counts, isLow } = await queryPartnerWorks(supplierId, { f: view }, { page });
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
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const mpages = Math.max(1, Math.ceil(movesTotal / PAGE_SIZE));
  const base = `/${locale}/fournisseur/stocks`;
  const href = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged: Record<string, string | undefined> = { ...sp, ...o };
    for (const k of ["f", "p", "mp", ...JKEYS]) if (merged[k]) u.set(k, merged[k]!);
    return `${base}?${u.toString()}`;
  };
  const pager = (cur: number, n: number, key: "p" | "mp") => (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-3 text-sm">
      {cur > 1 ? <Link className="underline" href={href({ [key]: String(cur - 1) })}>← {tr(locale, "Précédent", "Previous")}</Link> : <span className="text-muted-foreground">←</span>}
      <span>{tr(locale, "Page", "Page")} {cur} / {n}</span>
      {cur < n ? <Link className="underline" href={href({ [key]: String(cur + 1) })}>{tr(locale, "Suivant", "Next")} →</Link> : <span className="text-muted-foreground">→</span>}
    </nav>
  );
  const th = "whitespace-nowrap px-2 py-2";

  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Stocks", "Stock")}</h1>
      <nav aria-label={tr(locale, "Filtrer le stock", "Filter stock")} className="flex flex-wrap gap-2">
        {VIEWS.map(([k, f, e]) => (
          <Link key={k} href={href({ f: k, p: undefined })} aria-current={k === view ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm ${k === view ? "bg-primary text-primary-foreground" : ""}`}>
            {tr(locale, f, e)} ({counts[k as "all" | "low" | "out"]})
          </Link>
        ))}
      </nav>
      {total === 0 ? <p className="rounded-md border p-4 text-sm text-muted-foreground">{tr(locale, "Aucune création.", "No creations.")}</p> : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr><th className={th}>{tr(locale, "Création", "Creation")}</th><th className={th}>{tr(locale, "Variante", "Variant")}</th><th className={th}>{tr(locale, "Stock total", "Total stock")}</th><th className={th}>{tr(locale, "Réservé", "Reserved")}</th><th className={th}>{tr(locale, "Dispo.", "Avail.")}</th><th className={th}>{tr(locale, "Alerte", "Alert")}</th><th className={th}>Actions</th></tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const avail = availOf(p);
                  const title = fr ? p.name : p.nameEn;
                  const tot = p.variants.length > 0 ? p.variants.reduce((n, v) => n + v.stock, 0) : p.stock;
                  const res = p.variants.length > 0 ? p.variants.reduce((n, v) => n + v.reserved, 0) : p.reserved;
                  return (
                    <tr key={p.slug} className="border-b align-top">
                      <td className="max-w-56 px-2 py-2 font-medium"><Link href={`/${locale}/fournisseur/oeuvres/${p.slug}`} className="hover:underline">{title}</Link></td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">{p.variants.length > 0 ? p.variants.map((v) => `${v.label} : ${v.stock - v.reserved}/${v.stock}`).join(" · ") : "—"}</td>
                      <td className="px-2 py-2">{tot}</td>
                      <td className="px-2 py-2">{res}</td>
                      <td className="px-2 py-2 font-medium">{avail}</td>
                      <td className="px-2 py-2">
                        {p.status === "PUBLISHED" && avail <= 0 && <Pill cls="bg-red-100 text-red-900">{tr(locale, "Épuisée", "Sold out")}</Pill>}
                        {p.status === "PUBLISHED" && avail > 0 && isLow(p) && <Pill cls="bg-amber-100 text-amber-900">{tr(locale, "Stock bas", "Low stock")}</Pill>}
                      </td>
                      <td className="px-2 py-2"><Link href={`/${locale}/fournisseur/oeuvres/${p.slug}#stock`} className="inline-flex min-h-9 items-center rounded-md border px-3 text-xs">{tr(locale, "Ajuster le stock", "Adjust stock")}</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pager(Math.min(page, pages), pages, "p")}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-heading text-2xl text-primary">{tr(locale, "Journal des mouvements de stock", "Stock movement log")}</h2>
        <StockFilters pf="j" locale={locale} sp={jsp} action={base} hidden={{ f: sp.f }} />
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
