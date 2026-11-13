import Link from "next/link";
import { JOURNAL_TYPES, type JournalParams } from "@/lib/stock-journal";
import { MOVEMENT_LABELS } from "@/lib/stock";
import { tr } from "@/lib/tr";
import { DateRangeFields } from "@/components/admin/date-range-fields";
import { periodLabels, todayParis } from "@/components/admin/period-labels";
import { dateModeOf, rangeFields } from "@/lib/admin-works";
import type { Locale } from "@/lib/i18n";

const input = "h-10 rounded-md border bg-background px-2";

/** Formulaire GET de filtres du journal (conserve les autres paramètres via `hidden`). */
export function StockFilters({ locale, sp, action, hidden, partner, pf = "" }: { pf?: string; locale: Locale; sp: JournalParams; action: string; hidden?: Record<string, string | undefined>; partner?: { id: string; displayName: string }[] }) {
  const fr = locale !== "en";
  const mode = sp.d ? dateModeOf(sp.d) : sp.from || sp.to ? "custom" : "all";
  const range = mode === "custom" ? { from: sp.from ?? "", to: sp.to ?? "" } : rangeFields({ d: mode });
  return (
    <form method="get" action={action} key={JSON.stringify(sp)} className="flex flex-wrap items-end gap-3 text-sm">
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {partner && (
        <label className="grid gap-1">{tr(locale, "Partenaire", "Partner")}
          <select name={pf + "sup"} defaultValue={sp.sup ?? ""} className={input}>
            <option value="">{tr(locale, "Tous", "All")}</option>
            {partner.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
          </select>
        </label>
      )}
      <label className="grid gap-1">{tr(locale, "Création (titre)", "Creation (title)")}<input name={pf + "q"} defaultValue={sp.q ?? ""} className={input} /></label>
      <label className="grid gap-1">Type
        <select name={pf + "t"} defaultValue={sp.t ?? ""} className={input}>
          <option value="">{tr(locale, "Tous", "All")}</option>
          {JOURNAL_TYPES.map((t) => <option key={t} value={t}>{MOVEMENT_LABELS[t][fr ? "fr" : "en"]}</option>)}
        </select>
      </label>
      <DateRangeFields prefix={pf} mode={mode} from={range.from} to={range.to} today={todayParis()} disabled={false} inputCls={input} labels={periodLabels(locale)} />
      <label className="grid gap-1">{tr(locale, "Auteur / acheteur (e-mail)", "Author / buyer (e-mail)")}<input name={pf + "who"} defaultValue={sp.who ?? ""} className={input} /></label>
      <label className="grid gap-1">{tr(locale, "Motif", "Reason")}<input name={pf + "r"} defaultValue={sp.r ?? ""} className={input} /></label>
      <label className="grid gap-1">{tr(locale, "Tri", "Sort")}
        <select name={pf + "dir"} defaultValue={sp.dir === "asc" ? "asc" : "desc"} className={input}>
          <option value="desc">{tr(locale, "Récent d'abord", "Newest first")}</option>
          <option value="asc">{tr(locale, "Ancien d'abord", "Oldest first")}</option>
        </select>
      </label>
      <button className="h-10 rounded-md bg-primary px-4 text-primary-foreground">{tr(locale, "Filtrer", "Filter")}</button>
      <Link href={action + (hidden && Object.values(hidden).some(Boolean) ? `?${new URLSearchParams(Object.entries(hidden).filter(([, v]) => v) as [string, string][]).toString()}` : "")} className="inline-flex h-10 items-center rounded-md border px-4">{tr(locale, "Réinitialiser", "Reset")}</Link>
    </form>
  );
}
