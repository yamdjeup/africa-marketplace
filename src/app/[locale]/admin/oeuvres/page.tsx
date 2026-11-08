import Link from "next/link";
import { bulkModerateProducts } from "../actions";
import { db } from "@/lib/db";
import { MOVEMENT_LABELS } from "@/lib/stock";
import { tr } from "@/lib/tr";
import type { Locale } from "@/lib/i18n";
import { inputCls } from "@/components/fournisseur/parts";
import { ConfirmButton, PhotoLightbox, SelectAll } from "@/components/admin/table-widgets";
import { DateRangeFields } from "@/components/admin/date-range-fields";
import { PAGE_SIZE, TABS, WAIT_ALERT_H, WAIT_WARN_H, dateModeOf, isoDay, queryWorks, rangeFields, tabOf, waitHours, waitLabel, worksWhere, type Tab, type WorkParams } from "@/lib/admin-works";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<WorkParams & { mp?: string; done?: string; dec?: string; error?: string }> };

const TAB_LABEL: Record<Tab, [string, string]> = { pending: ["En attente", "Pending"], published: ["Publiées", "Published"], rejected: ["Refusées", "Rejected"], all: ["Toutes", "All"] };
const BADGE: Record<string, [string, string, string]> = {
  SUBMITTED: ["En attente", "Pending", "bg-amber-100 text-amber-900"],
  PUBLISHED: ["Publiée", "Published", "bg-emerald-100 text-emerald-900"],
  REJECTED: ["Refusée", "Rejected", "bg-red-100 text-red-900"],
};
const KEYS = ["f", "d", "from", "to", "q", "sup", "cat", "st", "sort", "dir"] as const;

export default async function AdminWorks({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const tab = tabOf(sp.f);
  const fr = locale !== "en";
  const page = Math.max(1, Math.trunc(Number(sp.p)) || 1);
  const mpage = Math.max(1, Math.trunc(Number(sp.mp)) || 1);
  const mode = dateModeOf(sp.d);
  const today = isoDay(new Date());
  const range = rangeFields(sp);
  const dtf = (d: Date | null) => (d ? d.toLocaleString(fr ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

  const href = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged: Record<string, string | undefined> = { ...sp, ...o };
    for (const k of [...KEYS, "p", "mp"]) if (merged[k]) u.set(k, merged[k]!);
    return `/${locale}/admin/oeuvres?${u.toString()}`;
  };
  const csvHref = `/api/admin/works?${new URLSearchParams(Object.entries(sp).filter(([k, v]) => (KEYS as readonly string[]).includes(k) && typeof v === "string" && v) as [string, string][]).toString()}`;
  const sortHref = (key: string) => href({ sort: key, dir: sp.sort === key && sp.dir !== "asc" ? "asc" : "desc", p: undefined });
  const arrow = (key: string) => (sp.sort === key ? (sp.dir === "asc" ? " ▲" : " ▼") : "");

  const [{ list, total }, counts, sups, cats, moves, movesTotal] = await Promise.all([
    queryWorks(sp, tab, { page }),
    Promise.all(TABS.map(async (t) => [t, await db.product.count({ where: await worksWhere(sp, t) })] as const)),
    db.supplier.findMany({ where: { isDemo: false }, orderBy: { displayName: "asc" }, select: { id: true, displayName: true } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, nameEn: true } }),
    db.stockMovement.findMany({ orderBy: { createdAt: "desc" }, skip: (mpage - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.stockMovement.count(),
  ]);
  const hidden = tab === "pending" || mode === "all" ? 0 : (await db.product.count({ where: await worksWhere(sp, tab, true) })) - total;
  const showWait = tab === "pending" || tab === "all";
  const nowMs = new Date().getTime();
  const oldest = showWait ? await db.product.findFirst({ where: await worksWhere(sp, "pending"), orderBy: { submittedAt: "asc" }, select: { submittedAt: true, createdAt: true } }) : null;
  const catName = new Map(cats.map((c) => [c.slug, fr ? c.name : c.nameEn]));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const mpages = Math.max(1, Math.ceil(movesTotal / PAGE_SIZE));
  const showReason = tab === "rejected" || tab === "all";
  const lb = { open: tr(locale, "Agrandir la photo", "Enlarge photo"), close: tr(locale, "Fermer", "Close"), prev: tr(locale, "Photo précédente", "Previous photo"), next: tr(locale, "Photo suivante", "Next photo") };
  const th = "whitespace-nowrap px-2 py-2";
  const pager = (cur: number, n: number, key: "p" | "mp") => (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-3 text-sm">
      {cur > 1 ? <Link className="underline" href={href({ [key]: String(cur - 1) })}>← {tr(locale, "Précédent", "Previous")}</Link> : <span className="text-muted-foreground">←</span>}
      <span>{tr(locale, "Page", "Page")} {cur} / {n}</span>
      {cur < n ? <Link className="underline" href={href({ [key]: String(cur + 1) })}>{tr(locale, "Suivant", "Next")} →</Link> : <span className="text-muted-foreground">→</span>}
    </nav>
  );

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="font-heading text-3xl text-primary">{tr(locale, "Créations à modérer", "Creations to review")}</h1>
        {sp.done && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{sp.done === "1" && sp.dec === "P" ? tr(locale, "Création publiée.", "Creation published.") : sp.done === "1" && sp.dec === "R" ? tr(locale, "Création refusée.", "Creation rejected.") : <>{tr(locale, "Créations traitées : ", "Creations processed: ")}{sp.done}</>}</p>}
        {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{tr(locale, "Un motif est obligatoire pour refuser.", "A reason is required to reject.")}</p>}
        <nav aria-label={tr(locale, "Filtrer par statut", "Filter by status")} className="flex flex-wrap gap-2">
          {counts.map(([k, n]) => (
            <Link key={k} href={href({ f: k, p: undefined, sort: undefined, dir: undefined })} aria-current={k === tab ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm ${k === tab ? "bg-primary text-primary-foreground" : ""}`}>
              {tr(locale, ...TAB_LABEL[k])} ({n})
            </Link>
          ))}
        </nav>

        <form method="get" className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="f" value={tab} />
          <label className="text-sm font-medium">{tr(locale, "Recherche (création / partenaire)", "Search (creation / partner)")}<input name="q" defaultValue={sp.q ?? ""} className={inputCls} /></label>
          <label className="text-sm font-medium">{tr(locale, "Partenaire", "Partner")}
            <select name="sup" defaultValue={sp.sup ?? ""} className={inputCls}><option value="">{tr(locale, "Tous", "All")}</option>{sups.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}</select></label>
          <label className="text-sm font-medium">{tr(locale, "Catégorie", "Category")}
            <select name="cat" defaultValue={sp.cat ?? ""} className={inputCls}><option value="">{tr(locale, "Toutes", "All")}</option>{cats.map((c) => <option key={c.slug} value={c.slug}>{fr ? c.name : c.nameEn}</option>)}</select></label>
          <label className="text-sm font-medium">{tr(locale, "Statut", "Status")}
            <select name="st" defaultValue={sp.st ?? ""} className={inputCls}><option value="">{tr(locale, "Tous", "All")}</option>{Object.entries(BADGE).map(([k, b]) => <option key={k} value={k}>{tr(locale, b[0], b[1])}</option>)}</select></label>
          <DateRangeFields
            mode={mode} from={range.from} to={range.to} today={today} disabled={tab === "pending"} inputCls={inputCls}
            labels={{
              decision: tr(locale, "Date de décision", "Decision date"), today: tr(locale, "Aujourd'hui", "Today"), d7: tr(locale, "7 jours", "7 days"), d30: tr(locale, "30 jours", "30 days"),
              custom: tr(locale, "Plage personnalisée", "Custom range"), all: tr(locale, "Toutes les dates", "All dates"), from: tr(locale, "Du", "From"), to: tr(locale, "Au", "To"),
              invalid: tr(locale, "La date de début doit être antérieure ou égale à la date de fin.", "The start date must be on or before the end date."),
            }}
          />
          {range.swapped && <p className="text-xs text-orange-700 sm:col-span-4">{tr(locale, "Dates inversées : plage corrigée automatiquement.", "Dates were reversed: range corrected automatically.")}</p>}
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
            <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">{tr(locale, "Filtrer", "Filter")}</button>
            <Link href={`/${locale}/admin/oeuvres?f=${tab}`} className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm">{tr(locale, "Réinitialiser", "Reset")}</Link>
            <a href={csvHref} className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm">Export CSV</a>
          </div>
          {tab === "pending" && <p className="text-xs text-muted-foreground sm:col-span-4">{tr(locale, "L'onglet En attente n'est jamais filtré par date.", "The Pending tab is never filtered by date.")}</p>}
        </form>
        {tab !== "pending" && mode !== "all" && hidden > 0 && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            {hidden} {tr(locale, "création(s) masquée(s) par le filtre de date (dont les décisions sans date).", "creation(s) hidden by the date filter (including undated decisions).")}{" "}
            <Link className="underline" href={href({ d: "all", p: undefined })}>{tr(locale, "Voir toutes les dates", "Show all dates")}</Link>
          </p>
        )}

        {total === 0 ? (
          <p className="rounded-md border p-4 text-sm text-muted-foreground">{tr(locale, "Aucune création ne correspond à ces filtres.", "No creations match these filters.")}</p>
        ) : (
          <form action={bulkModerateProducts} className="space-y-3">
            <input type="hidden" name="back" value={href({})} />
            <p className="text-sm text-muted-foreground">{total} {tr(locale, "création(s)", "creation(s)")}{oldest && ` · ${tr(locale, "la plus ancienne en attente", "oldest pending")} : ${waitLabel(waitHours(oldest.submittedAt ?? oldest.createdAt, nowMs))}`}</p>
            <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
              <label className="min-w-56 flex-1 text-sm">{tr(locale, "Motif commun (obligatoire pour refuser)", "Common reason (required to reject)")}<input name="reason" className={inputCls} /></label>
              <button name="decision" value="PUBLISHED" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">{tr(locale, "Publier la sélection", "Publish selected")}</button>
              <button name="decision" value="REJECTED" className="min-h-11 rounded-md border border-destructive px-4 text-sm text-destructive">{tr(locale, "Refuser la sélection", "Reject selected")}</button>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className={th}><SelectAll label={tr(locale, "Tout sélectionner", "Select all")} /></th>
                    <th className={th}>Photo</th>
                    <th className={th}><Link href={sortHref("partner")}>{tr(locale, "Partenaire", "Partner")}{arrow("partner")}</Link></th>
                    <th className={th}><Link href={sortHref("name")}>{tr(locale, "Création", "Creation")}{arrow("name")}</Link></th>
                    <th className={th}><Link href={sortHref("cat")}>{tr(locale, "Catégorie", "Category")}{arrow("cat")}</Link></th>
                    <th className={th}><Link href={sortHref("price")}>{tr(locale, "Prix (€)", "Price (€)")}{arrow("price")}</Link></th>
                    <th className={th}><Link href={sortHref("stock")}>Stock{arrow("stock")}</Link></th>
                    <th className={th}>Description</th>
                    <th className={th}><Link href={sortHref("status")}>{tr(locale, "Statut", "Status")}{arrow("status")}</Link></th>
                    {showWait && <th className={th}><Link href={sortHref("wait")}>{tr(locale, "En attente depuis", "Waiting since")}{arrow("wait")}</Link></th>}
                    <th className={th}><Link href={sortHref("date")}>{tr(locale, "Décision", "Decision")}{arrow("date")}</Link></th>
                    {showReason && <th className={th}>{tr(locale, "Motif du refus", "Rejection reason")}</th>}
                    <th className={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
                    const b = BADGE[p.status];
                    const title = fr ? p.name : p.nameEn;
                    return (
                      <tr key={p.slug} className="border-b align-top">
                        <td className="px-2 py-2"><input type="checkbox" name="slug" value={p.slug} aria-label={title} className="size-5" /></td>
                        <td className="px-2 py-2"><PhotoLightbox images={imgs} title={title} labels={lb} /></td>
                        <td className="px-2 py-2">{p.partner}</td>
                        <td className="max-w-48 px-2 py-2                         font-medium">
                                                  {p.status === "PUBLISHED" ? (
                                                    <a href={`/${locale}/produits/${p.slug}`} target="_blank" rel="noopener noreferrer" title={tr(locale, "Ouvrir la fiche publique", "Open public page")} className="underline-offset-2 hover:underline">{title} <span aria-hidden="true" className="text-xs text-muted-foreground">↗</span></a>
                                                  ) : (
                                                    <>{title}{p.supplierId && <Link href={`/${locale}/admin/fournisseurs/${p.supplierId}/oeuvres`} className="block text-xs font-normal underline">{tr(locale, "Voir côté partenaire", "View partner side")}</Link>}</>
                                                  )}
                                                  {p.createdByAdmin && <span className="mt-1 block w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-normal">{tr(locale, "Saisie par l'administration", "Entered by administration")}</span>}
                          {(p.edition || p.authorAttestedAt || p.signatureFileId) && (
                            <span className="mt-1 block text-xs font-normal text-muted-foreground">
                              {p.edition && `${p.edition} · `}
                              {p.authorAttestedAt && `${tr(locale, "Attestation", "Attestation")} ${p.authorAttestedAt.toLocaleDateString(fr ? "fr-FR" : "en-GB")} · `}
                              {p.signatureFileId && <a className="underline" href={`/api/media/${p.signatureFileId}`} target="_blank" rel="noreferrer">{tr(locale, "signature", "signature")}</a>}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">{catName.get(p.categorySlug) ?? p.categorySlug}</td>
                        <td className="whitespace-nowrap px-2 py-2">{(p.priceCents / 100).toFixed(2)}</td>
                        <td className="px-2 py-2">{p.stock - p.reserved}</td>
                        <td className="max-w-56 px-2 py-2"><span title={p.description} className="line-clamp-2">{p.description}</span></td>
                        <td className="px-2 py-2">{b && <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${b[2]}`}>{tr(locale, b[0], b[1])}</span>}</td>
                        {showWait && (() => {
                          if (p.status !== "SUBMITTED") return <td className="px-2 py-2">—</td>;
                          const h = waitHours(p.submittedAt, nowMs);
                          const cls = h > WAIT_ALERT_H ? "bg-red-100 text-red-900" : h > WAIT_WARN_H ? "bg-orange-100 text-orange-900" : "bg-muted";
                          return <td className="whitespace-nowrap px-2 py-2">{dtf(p.submittedAt)} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{waitLabel(h)}{h > WAIT_ALERT_H ? " ⚠" : ""}</span></td>;
                        })()}
                        <td className="whitespace-nowrap px-2 py-2">{dtf(p.decidedAt)}</td>
                        {showReason && <td className="max-w-48 px-2 py-2 text-destructive">{p.status === "REJECTED" ? <span title={p.rejectReason ?? ""} className="line-clamp-2">{p.rejectReason || "—"}</span> : "—"}</td>}
                        <td className="whitespace-nowrap px-2 py-2">
                          {p.status === "SUBMITTED" && <button name="only" value={`PUBLISHED:${p.slug}`} className="mr-1 min-h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">{tr(locale, "Publier", "Publish")}</button>}
                          {p.status === "REJECTED" && <ConfirmButton name="only" value={`PUBLISHED:${p.slug}`} message={tr(locale, "Publier cette création refusée ?", "Publish this rejected creation?")} className="mr-1 min-h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">{tr(locale, "Publier", "Publish")}</ConfirmButton>}
                          {(p.status === "SUBMITTED" || p.status === "PUBLISHED") && <button name="only" value={`REJECTED:${p.slug}`} className="min-h-9 rounded-md border border-destructive px-3 text-xs text-destructive">{tr(locale, "Refuser", "Reject")}</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pager(Math.min(page, pages), pages, "p")}
          </form>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-2xl text-primary">{tr(locale, "Journal des mouvements de stock", "Stock movement log")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="border-b text-xs uppercase text-muted-foreground"><th className="py-2 pr-3">Date</th><th className="pr-3">{tr(locale, "Création", "Creation")}</th><th className="pr-3">Type</th><th className="pr-3">Qté</th><th className="pr-3">{tr(locale, "Motif", "Reason")}</th><th>{tr(locale, "Auteur", "Author")}</th></tr></thead>
            <tbody>{moves.map((m) => (
              <tr key={m.id} className="border-b">
                <td className="whitespace-nowrap py-2 pr-3">{dtf(m.createdAt)}</td>
                <td className="pr-3"><a href={`/${locale}/produits/${m.productSlug}`} target="_blank" rel="noopener noreferrer" title={tr(locale, "Ouvrir la fiche publique", "Open public page")} className="underline-offset-2 hover:underline">{m.productSlug} <span aria-hidden="true" className="text-xs text-muted-foreground">↗</span></a></td>
                <td className="pr-3">{MOVEMENT_LABELS[m.type as keyof typeof MOVEMENT_LABELS]?.[fr ? "fr" : "en"] ?? m.type}</td>
                <td className="pr-3">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                <td className="pr-3">{m.reason}</td><td>{m.authorLabel}</td>
              </tr>))}</tbody>
          </table>
        </div>
        {pager(Math.min(mpage, mpages), mpages, "mp")}
      </section>
    </div>
  );
}
