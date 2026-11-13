import Link from "next/link";
import { inputCls } from "@/components/fournisseur/parts";
import { pageCount, type ListQuery } from "@/lib/admin-list";
import { tr } from "@/lib/tr";
import { DateRangeFields } from "@/components/admin/date-range-fields";
import { periodLabels, todayParis } from "@/components/admin/period-labels";
import type { Locale } from "@/lib/i18n";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export function listHref(path: string, q: ListQuery, over: Partial<Record<"q" | "st" | "d" | "from" | "to" | "sort" | "dir" | "p", string>>, defaultStatus: string) {
  const custom = (over.d ?? q.d) === "custom";
  const v = { q: q.q, st: q.st, d: q.d === "all" ? "" : q.d, from: custom ? iso(q.from) : "", to: custom ? iso(q.to) : "", sort: q.sort, dir: q.asc ? "asc" : "desc", p: String(q.page), ...over };
  const u = new URLSearchParams();
  for (const [k, val] of Object.entries(v)) if (val && !(k === "st" && val === defaultStatus) && !(k === "p" && val === "1")) u.set(k, val);
  const s = u.toString();
  return s ? `${path}?${s}` : path;
}

export function resetHref(path: string, st: string, defaultStatus: string) { return st && st !== defaultStatus ? `${path}?st=${encodeURIComponent(st)}` : path; }

type Tab = { value: string; label: string; count?: number };

/** Onglets de statut + recherche + période (GET, état dans l'URL), puis pagination. */
export function ListFilters({ locale, path, q, tabs, defaultStatus, sorts }: { locale: Locale; path: string; q: ListQuery; tabs: Tab[]; defaultStatus: string; sorts?: [string, string][] }) {
  return (
    <div className="space-y-3">
      <nav className="flex flex-wrap gap-2" aria-label={tr(locale, "Filtrer par statut", "Filter by status")}>
        {tabs.map((t) => (
          <Link key={t.value} href={listHref(path, q, { st: t.value, p: "1" }, defaultStatus)} aria-current={q.st === t.value ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm ${q.st === t.value ? "bg-primary text-primary-foreground" : ""}`}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ""}
          </Link>
        ))}
      </nav>
      <form method="get" action={path} key={`${q.q}|${q.d}|${iso(q.from)}|${iso(q.to)}|${q.sort}|${q.asc}`} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="st" value={q.st} />
        <label className="text-xs">{tr(locale, "Recherche", "Search")}<input name="q" defaultValue={q.q} className={`${inputCls} w-56`} /></label>
        <DateRangeFields mode={q.d} from={iso(q.from)} to={iso(q.to)} today={todayParis()} disabled={false} inputCls={inputCls} labels={periodLabels(locale)} />
        {sorts && (
          <label className="text-xs">{tr(locale, "Tri", "Sort")}
            <select name="sort" defaultValue={q.sort} className={inputCls}>{sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
        )}
        <label className="text-xs">{tr(locale, "Ordre", "Order")}
          <select name="dir" defaultValue={q.asc ? "asc" : "desc"} className={inputCls}>
            <option value="desc">{tr(locale, "Récent d'abord", "Newest first")}</option>
            <option value="asc">{tr(locale, "Ancien d'abord", "Oldest first")}</option>
          </select>
        </label>
        <button className="min-h-11 rounded-md border px-3 text-sm">{tr(locale, "Filtrer", "Filter")}</button>
        <Link href={resetHref(path, q.st, defaultStatus)} className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm">{tr(locale, "Réinitialiser", "Reset")}</Link>
      </form>
    </div>
  );
}

export function Pager({ locale, path, q, total, defaultStatus }: { locale: Locale; path: string; q: ListQuery; total: number; defaultStatus: string }) {
  const pages = pageCount(total);
  const page = Math.min(q.page, pages);
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{total} {tr(locale, "résultat(s)", "result(s)")}</span>
      <div className="flex items-center gap-2">
        {page > 1 && <Link className="inline-flex min-h-11 items-center rounded-md border px-3" href={listHref(path, q, { p: String(page - 1) }, defaultStatus)}>{tr(locale, "← Précédent", "← Previous")}</Link>}
        <span>{tr(locale, "Page", "Page")} {page} / {pages}</span>
        {page < pages && <Link className="inline-flex min-h-11 items-center rounded-md border px-3" href={listHref(path, q, { p: String(page + 1) }, defaultStatus)}>{tr(locale, "Suivant →", "Next →")}</Link>}
      </div>
    </div>
  );
}
