import Link from "next/link";
import { db } from "@/lib/db";
import { MOVEMENT_LABELS } from "@/lib/stock";
import type { Locale } from "@/lib/i18n";
import { StockFilters } from "@/components/marketplace/stock-filters";
import { JOURNAL_KEYS, journalOrder, journalWhere, type JournalParams } from "@/lib/stock-journal";
import { tr } from "@/lib/tr";

export const dynamic = "force-dynamic";
const PAGE = 50;
type SP = JournalParams & { p?: string; sp?: string };

export default async function AdminStockJournal({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const fr = locale !== "en";
  const page = Math.max(1, Math.trunc(Number(sp.p)) || 1);
  const sups = await db.supplier.findMany({ where: { isDemo: false }, orderBy: { displayName: "asc" }, select: { id: true, displayName: true } });
  const where = await journalWhere(sp);
  const [rows, total] = await Promise.all([
    db.stockMovement.findMany({ where, orderBy: journalOrder(sp), skip: (page - 1) * PAGE, take: PAGE }),
    db.stockMovement.count({ where }),
  ]);
  const slugs = [...new Set(rows.map((m) => m.productSlug))];
  const prods = await db.product.findMany({ where: { slug: { in: slugs } }, select: { slug: true, name: true, nameEn: true, supplierId: true } });
  const prodOf = new Map(prods.map((x) => [x.slug, x]));
  const vids = [...new Set(rows.map((m) => m.variantId).filter((x): x is string => !!x))];
  const vlabel = new Map((await db.productVariant.findMany({ where: { id: { in: vids } }, select: { id: true, label: true } })).map((v) => [v.id, v.label]));
  const sp2 = Math.max(1, Math.trunc(Number(sp.sp)) || 1);
  const stockWhere = { supplier: { isDemo: false }, ...(sp.sup ? { supplierId: sp.sup } : {}) };
  const [stockRows, stockTotal] = await Promise.all([
    db.product.findMany({ where: stockWhere, orderBy: { name: "asc" }, skip: (sp2 - 1) * PAGE, take: PAGE, select: { slug: true, name: true, nameEn: true, stock: true, reserved: true, supplierId: true } }),
    db.product.count({ where: stockWhere }),
  ]);
  const varRows = await db.productVariant.findMany({ where: { productSlug: { in: stockRows.map((s) => s.slug) } }, select: { productSlug: true, label: true, stock: true, reserved: true } });
  const supName = new Map(sups.map((s) => [s.id, s.displayName]));
  const holds = await db.checkoutHold.findMany({ where: { status: "HELD", expiresAt: { gt: new Date() } }, select: { expiresAt: true, payload: true } });
  const holdsBy = new Map<string, string[]>();
  for (const h of holds) {
    const pl = h.payload as { email?: string; lines?: { slug: string; quantity: number }[] } | null;
    for (const l of pl?.lines ?? []) holdsBy.set(l.slug, [...(holdsBy.get(l.slug) ?? []), `${pl?.email ?? "?"} x${l.quantity} -> ${h.expiresAt.toLocaleTimeString(fr ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })}`]);
  }
  const spages = Math.max(1, Math.ceil(stockTotal / PAGE));
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (p: number) => {
    const u = new URLSearchParams();
    for (const k of JOURNAL_KEYS) if (sp[k]) u.set(k, sp[k]!);
    u.set("p", String(p));
    return `/${locale}/admin/stock?${u.toString()}`;
  };
  const spHref = (n: number) => {
    const u = new URLSearchParams();
    for (const k of JOURNAL_KEYS) if (sp[k]) u.set(k, sp[k]!);
    u.set("sp", String(n));
    return `/${locale}/admin/stock?${u.toString()}`;
  };
  const dtf = (d: Date) => d.toLocaleString(fr ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="space-y-4">
      <Link href={`/${locale}/admin/fournisseurs`} className="text-sm underline">← {tr(locale, "Partenaires", "Partners")}</Link>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Stocks", "Stock")}</h1>
      <section className="space-y-2">
        <h2 className="font-heading text-2xl text-primary">{tr(locale, "Stock par création", "Stock by creation")}</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-2 py-2">{tr(locale, "Création", "Creation")}</th><th className="px-2">{tr(locale, "Partenaire", "Partner")}</th><th className="px-2">Total</th><th className="px-2">{tr(locale, "Réservé", "Reserved")}</th><th className="px-2">{tr(locale, "Dispo.", "Avail.")}</th><th className="px-2">{tr(locale, "Réservations actives", "Active holds")}</th></tr></thead>
            <tbody>{stockRows.map((rw) => {
              const s = { ...rw, variants: varRows.filter((v) => v.productSlug === rw.slug) };
              const tot = s.variants.length ? s.variants.reduce((n, v) => n + v.stock, 0) : s.stock;
              const res = s.variants.length ? s.variants.reduce((n, v) => n + v.reserved, 0) : s.reserved;
              return (
                <tr key={s.slug} className="border-b align-top">
                  <td className="px-2 py-2 font-medium">{fr ? s.name : s.nameEn}{s.variants.length > 0 && <span className="block text-xs font-normal text-muted-foreground">{s.variants.map((v) => `${v.label} : ${v.stock - v.reserved}/${v.stock}`).join(" · ")}</span>}</td>
                  <td className="px-2">{supName.get(s.supplierId ?? "") ?? "—"}</td><td className="px-2">{tot}</td><td className="px-2">{res}</td><td className="px-2 font-medium">{tot - res}</td>
                  <td className="px-2 text-xs">{(holdsBy.get(s.slug) ?? []).join(" ; ") || "—"}</td>
                </tr>);
            })}</tbody>
          </table>
        </div>
        <nav aria-label="Pagination stock" className="flex items-center gap-3 text-sm">
          {sp2 > 1 && <Link className="underline" href={spHref(sp2 - 1)}>← {tr(locale, "Précédent", "Previous")}</Link>}
          <span>Page {Math.min(sp2, spages)} / {spages}</span>
          {sp2 < spages && <Link className="underline" href={spHref(sp2 + 1)}>{tr(locale, "Suivant", "Next")} →</Link>}
        </nav>
      </section>
      <h2 className="font-heading text-2xl text-primary">{tr(locale, "Journal des mouvements de stock", "Stock movement log")}</h2>      <StockFilters locale={locale} sp={sp} action={`/${locale}/admin/stock`} partner={sups} />
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
