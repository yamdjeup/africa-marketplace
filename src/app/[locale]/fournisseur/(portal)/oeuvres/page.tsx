import Link from "next/link";
import { Pill, inputCls } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import { getPortalContext } from "@/lib/supplier";
import { tr } from "@/lib/tr";
import { MOVEMENT_LABELS } from "@/lib/stock";
import type { Locale } from "@/lib/i18n";
import { PhotoLightbox } from "@/components/admin/table-widgets";
import { PAGE_SIZE, WAIT_ALERT_H, WAIT_WARN_H, waitHours, waitLabel } from "@/lib/admin-works";
import { PTABS, ptabOf, queryPartnerWorks, type PTab, type PWorkParams } from "@/lib/partner-works";

export const metadata = { title: "Créations et stock", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<PWorkParams & { saved?: string; error?: string; mp?: string }> };

const STATUS: Record<string, [string, string, string]> = {
  DRAFT: ["Brouillon", "Draft", "bg-muted text-foreground"],
  SUBMITTED: ["En modération", "Under review", "bg-amber-100 text-amber-900"],
  PUBLISHED: ["Publiée", "Published", "bg-emerald-100 text-emerald-900"],
  REJECTED: ["Refusée", "Rejected", "bg-red-100 text-red-900"],
  HELD: ["Masquée (compte suspendu)", "Hidden (account suspended)", "bg-red-100 text-red-900"],
};
const TAB_LABEL: Record<PTab, [string, string]> = { all: ["Toutes", "All"], SUBMITTED: ["En modération", "Under review"], PUBLISHED: ["Publiées", "Published"], REJECTED: ["Refusées", "Rejected"], DRAFT: ["Brouillons", "Drafts"], low: ["Stock bas", "Low stock"] };
const KEYS = ["f", "q", "cat", "st", "sort", "dir"] as const;

export default async function WorksPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const fr = locale !== "en";
  const tab = ptabOf(sp.f);
  const page = Math.max(1, Math.trunc(Number(sp.p)) || 1);
  const mpage = Math.max(1, Math.trunc(Number(sp.mp)) || 1);
  const supplierId = ctx.supplier.id;
  const dtf = (d: Date | null) => (d ? d.toLocaleString(fr ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
  const nowMs = new Date().getTime();

  const { list, total, counts, isLow } = await queryPartnerWorks(supplierId, sp, { page });
  const own = await db.product.findMany({ where: { supplierId }, select: { slug: true, name: true, nameEn: true } });
  const slugs = own.map((o) => o.slug);
  const titleOf = new Map(own.map((o) => [o.slug, fr ? o.name : o.nameEn]));
  const [moves, movesTotal, cats] = await Promise.all([
    db.stockMovement.findMany({ where: { productSlug: { in: slugs } }, orderBy: { createdAt: "desc" }, skip: (mpage - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.stockMovement.count({ where: { productSlug: { in: slugs } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, nameEn: true } }),
  ]);
  const catName = new Map(cats.map((c) => [c.slug, fr ? c.name : c.nameEn]));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const mpages = Math.max(1, Math.ceil(movesTotal / PAGE_SIZE));

  const base = `/${locale}/fournisseur/oeuvres`;
  const href = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged: Record<string, string | undefined> = { ...sp, ...o };
    for (const k of [...KEYS, "p", "mp"]) if (merged[k]) u.set(k, merged[k]!);
    return `${base}?${u.toString()}`;
  };
  const csvHref = `/api/partner/works?${new URLSearchParams(Object.entries(sp).filter(([k, v]) => (KEYS as readonly string[]).includes(k) && typeof v === "string" && v) as [string, string][]).toString()}`;
  const sortHref = (key: string) => href({ sort: key, dir: sp.sort === key && sp.dir !== "asc" ? "asc" : "desc", p: undefined });
  const arrow = (key: string) => (sp.sort === key ? (sp.dir === "asc" ? " ▲" : " ▼") : "");
  const lb = { open: tr(locale, "Agrandir la photo", "Enlarge photo"), close: tr(locale, "Fermer", "Close"), prev: tr(locale, "Photo précédente", "Previous photo"), next: tr(locale, "Photo suivante", "Next photo") };
  const th = "whitespace-nowrap px-2 py-2";
  const showWait = tab === "all" || tab === "SUBMITTED";
  const showReason = tab === "all" || tab === "REJECTED";
  const pager = (cur: number, n: number, key: "p" | "mp") => (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-3 text-sm">
      {cur > 1 ? <Link className="underline" href={href({ [key]: String(cur - 1) })}>← {tr(locale, "Précédent", "Previous")}</Link> : <span className="text-muted-foreground">←</span>}
      <span>{tr(locale, "Page", "Page")} {cur} / {n}</span>
      {cur < n ? <Link className="underline" href={href({ [key]: String(cur + 1) })}>{tr(locale, "Suivant", "Next")} →</Link> : <span className="text-muted-foreground">→</span>}
    </nav>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl text-primary">{tr(locale, "Créations et stock", "Creations and stock")}</h1>
        {!ctx.viewingAs && <Link href={`${base}/nouvelle`} className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">{tr(locale, "Ajouter une création", "Add a creation")}</Link>}
      </div>
      {sp.saved && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, "Enregistré.", "Saved.")}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{tr(locale, "Action impossible.", "Action not possible.")}</p>}

      <nav aria-label={tr(locale, "Filtrer par statut", "Filter by status")} className="flex flex-wrap gap-2">
        {PTABS.map((k) => (
          <Link key={k} href={href({ f: k, st: undefined, p: undefined, sort: undefined, dir: undefined })} aria-current={k === tab ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm ${k === tab ? "bg-primary text-primary-foreground" : ""}`}>
            {tr(locale, ...TAB_LABEL[k])} ({counts[k]})
          </Link>
        ))}
      </nav>

      <form method="get" className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name="f" value={tab} />
        <label className="text-sm font-medium">{tr(locale, "Recherche (titre)", "Search (title)")}<input name="q" defaultValue={sp.q ?? ""} className={inputCls} /></label>
        <label className="text-sm font-medium">{tr(locale, "Catégorie", "Category")}
          <select name="cat" defaultValue={sp.cat ?? ""} className={inputCls}><option value="">{tr(locale, "Toutes", "All")}</option>{cats.map((c) => <option key={c.slug} value={c.slug}>{fr ? c.name : c.nameEn}</option>)}</select></label>
        <label className="text-sm font-medium">{tr(locale, "Statut", "Status")}
          <select name="st" defaultValue={sp.st ?? ""} className={inputCls}><option value="">{tr(locale, "Tous", "All")}</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{tr(locale, v[0], v[1])}</option>)}</select></label>
        <div className="flex flex-wrap items-end gap-2">
          <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">{tr(locale, "Filtrer", "Filter")}</button>
          <Link href={`${base}?f=${tab}`} className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm">{tr(locale, "Réinitialiser", "Reset")}</Link>
          <a href={csvHref} className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm">Export CSV</a>
        </div>
      </form>

      {total === 0 ? (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">{counts.all === 0 && !sp.q && !sp.cat && !sp.st ? tr(locale, "Aucune création pour le moment.", "No creations yet.") : tr(locale, "Aucune création ne correspond à ces filtres.", "No creations match these filters.")}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{total} {tr(locale, "création(s)", "creation(s)")}</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className={th}>Photo</th>
                  <th className={th}><Link href={sortHref("name")}>{tr(locale, "Création", "Creation")}{arrow("name")}</Link></th>
                  <th className={th}>{tr(locale, "Catégorie", "Category")}</th>
                  <th className={th}><Link href={sortHref("price")}>{tr(locale, "Prix (€)", "Price (€)")}{arrow("price")}</Link></th>
                  <th className={th}><Link href={sortHref("stock")}>Stock{arrow("stock")}</Link></th>
                  <th className={th}>{tr(locale, "Statut", "Status")}</th>
                  {showReason && <th className={th}>{tr(locale, "Motif du refus", "Rejection reason")}</th>}
                  {showWait && <th className={th}><Link href={sortHref("wait")}>{tr(locale, "En attente depuis", "Waiting since")}{arrow("wait")}</Link></th>}
                  <th className={th}><Link href={sortHref("date")}>{tr(locale, "Décision", "Decision")}{arrow("date")}</Link></th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const avail = p.stock - p.reserved;
                  const st = STATUS[p.status] ?? STATUS.DRAFT;
                  const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
                  const title = fr ? p.name : p.nameEn;
                  const since = p.submittedAt ?? p.createdAt;
                  const h = waitHours(since, nowMs);
                  const cls = h > WAIT_ALERT_H ? "bg-red-100 text-red-900" : h > WAIT_WARN_H ? "bg-orange-100 text-orange-900" : "bg-muted";
                  return (
                    <tr key={p.slug} className="border-b align-top hover:bg-muted/50">
                      <td className="px-2 py-2"><PhotoLightbox images={imgs} title={title} labels={lb} /></td>
                      <td className="max-w-56 px-2 py-2 font-medium">
                        <Link href={`${base}/${p.slug}`} className="hover:underline">{title}</Link>
                        {p.status === "PUBLISHED" && <a href={`/${locale}/produits/${p.slug}`} target="_blank" rel="noopener noreferrer" title={tr(locale, "Ouvrir la fiche publique", "Open public page")} aria-label={tr(locale, "Ouvrir la fiche publique", "Open public page")} className="ml-1 text-muted-foreground hover:text-foreground">↗</a>}
                      </td>
                      <td className="px-2 py-2">{catName.get(p.categorySlug) ?? p.categorySlug}</td>
                      <td className="whitespace-nowrap px-2 py-2">{(p.priceCents / 100).toFixed(2)}</td>
                      <td className="whitespace-nowrap px-2 py-2">
                        {avail}{p.reserved > 0 ? ` (${p.reserved} ${tr(locale, "réservé(s)", "reserved")})` : ""}
                        {p.status === "PUBLISHED" && avail <= 0 && <Pill cls="ml-1 bg-red-100 text-red-900">{tr(locale, "Épuisée", "Sold out")}</Pill>}
                        {p.status === "PUBLISHED" && avail > 0 && isLow(p) && <Pill cls="ml-1 bg-amber-100 text-amber-900">{tr(locale, "Stock bas", "Low stock")}</Pill>}
                      </td>
                      <td className="px-2 py-2"><Pill cls={st[2]}>{tr(locale, st[0], st[1])}</Pill></td>
                      {showReason && <td className="max-w-48 px-2 py-2 text-destructive/80">{p.status === "REJECTED" ? <span title={p.rejectReason ?? ""} className="line-clamp-2">{p.rejectReason || "—"}</span> : "—"}</td>}
                      {showWait && (p.status === "SUBMITTED"
                        ? <td className="whitespace-nowrap px-2 py-2">{dtf(since)} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{waitLabel(h)}{h > WAIT_ALERT_H ? " ⚠" : ""}</span></td>
                        : <td className="px-2 py-2">—</td>)}
                      <td className="whitespace-nowrap px-2 py-2">{dtf(p.decidedAt)}</td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <Link href={`${base}/${p.slug}`} className="mr-2 inline-flex min-h-9 items-center rounded-md border px-3 text-xs">{tr(locale, "Modifier", "Edit")}</Link>
                        <Link href={`${base}/${p.slug}#stock`} className="inline-flex min-h-9 items-center rounded-md border px-3 text-xs">{tr(locale, "Ajuster le stock", "Adjust stock")}</Link>
                      </td>
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
        {moves.length === 0 ? <p className="text-sm text-muted-foreground">{tr(locale, "Aucun mouvement.", "No movements.")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="border-b text-xs uppercase text-muted-foreground"><th className="py-2 pr-3">Date</th><th className="pr-3">{tr(locale, "Création", "Creation")}</th><th className="pr-3">Type</th><th className="pr-3">Qté</th><th className="pr-3">{tr(locale, "Motif", "Reason")}</th><th>{tr(locale, "Auteur", "Author")}</th></tr></thead>
              <tbody>{moves.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="whitespace-nowrap py-2 pr-3">{dtf(m.createdAt)}</td>
                  <td className="pr-3">{titleOf.get(m.productSlug) ?? m.productSlug}</td>
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
