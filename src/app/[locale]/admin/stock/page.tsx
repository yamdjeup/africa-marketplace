import Link from "next/link";
import { db } from "@/lib/db";
import { MOVEMENT_LABELS } from "@/lib/stock";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const dynamic = "force-dynamic";
const PAGE = 50;
type SP = { sup?: string; q?: string; from?: string; to?: string; p?: string };

export default async function AdminStockJournal({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const fr = locale !== "en";
  const page = Math.max(1, Math.trunc(Number(sp.p)) || 1);
  const sups = await db.supplier.findMany({ where: { isDemo: false }, orderBy: { displayName: "asc" }, select: { id: true, displayName: true } });
  const slugFilter: { in?: string[]; contains?: string; mode?: "insensitive" } = {};
  if (sp.sup) slugFilter.in = (await db.product.findMany({ where: { supplierId: sp.sup }, select: { slug: true } })).map((x) => x.slug);
  const where: { productSlug?: typeof slugFilter; createdAt?: { gte?: Date; lte?: Date } } = {};
  if (sp.q?.trim()) {
    slugFilter.contains = sp.q.trim();
    slugFilter.mode = "insensitive";
  }
  if (slugFilter.in || slugFilter.contains) where.productSlug = slugFilter;
  const day = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const from = day(sp.from);
  const to = day(sp.to);
  if (from || to) where.createdAt = { ...(from ? { gte: new Date(`${from}T00:00:00+01:00`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59+01:00`) } : {}) };
  const [rows, total] = await Promise.all([
    db.stockMovement.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.stockMovement.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (p: number) => {
    const u = new URLSearchParams();
    for (const k of ["sup", "q", "from", "to"] as const) if (sp[k]) u.set(k, sp[k]!);
    u.set("p", String(p));
    return `/${locale}/admin/stock?${u.toString()}`;
  };
  const dtf = (d: Date) => d.toLocaleString(fr ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="space-y-4">
      <Link href={`/${locale}/admin/fournisseurs`} className="text-sm underline">← {tr(locale, "Partenaires", "Partners")}</Link>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Journal des mouvements de stock", "Stock movement log")}</h1>
      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <label className="grid gap-1">{tr(locale, "Partenaire", "Partner")}
          <select name="sup" defaultValue={sp.sup ?? ""} className="h-10 rounded-md border px-2">
            <option value="">{tr(locale, "Tous", "All")}</option>
            {sups.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
          </select>
        </label>
        <label className="grid gap-1">{tr(locale, "Création (slug)", "Creation (slug)")}<input name="q" defaultValue={sp.q ?? ""} className="h-10 rounded-md border px-2" /></label>
        <label className="grid gap-1">{tr(locale, "Du", "From")}<input type="date" name="from" defaultValue={from ?? ""} className="h-10 rounded-md border px-2" /></label>
        <label className="grid gap-1">{tr(locale, "Au", "To")}<input type="date" name="to" defaultValue={to ?? ""} className="h-10 rounded-md border px-2" /></label>
        <button className="h-10 rounded-md bg-primary px-4 text-primary-foreground">{tr(locale, "Filtrer", "Filter")}</button>
      </form>
      <p className="text-sm text-muted-foreground">{total} {tr(locale, "mouvement(s)", "movement(s)")}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead><tr className="border-b text-xs uppercase text-muted-foreground"><th className="py-2 pr-3">Date</th><th className="pr-3">{tr(locale, "Création", "Creation")}</th><th className="pr-3">Type</th><th className="pr-3">{tr(locale, "Qté", "Qty")}</th><th className="pr-3">{tr(locale, "Motif", "Reason")}</th><th>{tr(locale, "Auteur", "Author")}</th></tr></thead>
          <tbody>{rows.map((m) => (
            <tr key={m.id} className="border-b">
              <td className="whitespace-nowrap py-2 pr-3">{dtf(m.createdAt)}</td>
              <td className="pr-3"><Link href={`/${locale}/produits/${m.productSlug}`} className="underline-offset-2 hover:underline">{m.productSlug}</Link></td>
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
