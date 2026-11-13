import Link from "next/link";
import { STOCK_LIST_KEYS, STOCK_STATUSES, type StockListParams, type loadStockList } from "@/lib/stock-list";
import { tr } from "@/lib/tr";
import { DateRangeFields } from "@/components/admin/date-range-fields";
import { periodLabels, todayParis } from "@/components/admin/period-labels";
import { rangeFields } from "@/lib/admin-works";
import type { Locale } from "@/lib/i18n";

const input = "h-10 rounded-md border bg-background px-2";
type Data = Awaited<ReturnType<typeof loadStockList>>;

const STATUS_LABEL: Record<(typeof STOCK_STATUSES)[number], [string, string]> = {
  all: ["Tous", "All"], avail: ["Disponible", "Available"], low: ["Stock bas", "Low stock"], out: ["Épuisée", "Sold out"], held: ["Avec réservation", "With hold"],
};

/** Filtres + tableau « Stock par création » (admin et partenaire). La période porte sur la date du dernier mouvement de stock. */
export function StockListView({ locale, sp, action, data, hidden, partner, supName, adjust }: { adjust?: (slug: string) => string; locale: Locale; sp: StockListParams; action: string; data: Data; hidden?: Record<string, string | undefined>; partner?: { id: string; displayName: string }[]; supName?: Map<string, string> }) {
  const fr = locale !== "en";
  const mode = data.mode;
  const range = mode === "custom" ? { from: sp.sfrom ?? "", to: sp.sto ?? "" } : rangeFields({ d: mode });
  const keep = new URLSearchParams();
  for (const k of STOCK_LIST_KEYS) if (sp[k]) keep.set(k, sp[k]!);
  for (const [k, v] of Object.entries(hidden ?? {})) if (v) keep.set(k, v);
  const href = (n: number) => { const u = new URLSearchParams(keep); u.set("sp", String(n)); return `${action}?${u.toString()}`; };
  const resetQs = new URLSearchParams(Object.entries(hidden ?? {}).filter(([, v]) => v) as [string, string][]).toString();
  const dtf = (d: Date) => d.toLocaleString(fr ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="space-y-3">
      <form method="get" action={action} key={JSON.stringify(sp)} className="flex flex-wrap items-end gap-3 text-sm">
        {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        {partner && (
          <label className="grid gap-1">{tr(locale, "Partenaire", "Partner")}
            <select name="ssup" defaultValue={sp.ssup ?? ""} className={input}><option value="">{tr(locale, "Tous", "All")}</option>{partner.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}</select>
          </label>
        )}
        <label className="grid gap-1">{tr(locale, "Création (titre)", "Creation (title)")}<input name="sq" defaultValue={sp.sq ?? ""} className={input} /></label>
        <label className="grid gap-1">{tr(locale, "Catégorie", "Category")}
          <select name="scat" defaultValue={sp.scat ?? ""} className={input}><option value="">{tr(locale, "Toutes", "All")}</option>{data.cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </label>
        <label className="grid gap-1">{tr(locale, "Statut", "Status")}
          <select name="sst" defaultValue={data.status} className={input}>{STOCK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s][fr ? 0 : 1]} ({data.counts[s]})</option>)}</select>
        </label>
        <label className="grid gap-1">{tr(locale, "Variante", "Variant")}<input name="svar" defaultValue={sp.svar ?? ""} className={input} /></label>
        <DateRangeFields prefix="s" mode={mode} from={range.from} to={range.to} today={todayParis()} disabled={false} inputCls={input} labels={{ ...periodLabels(locale), decision: tr(locale, "Dernier mouvement", "Last movement") }} />
        <label className="grid gap-1">{tr(locale, "Tri", "Sort")}
          <select name="ssort" defaultValue={sp.ssort ?? "name"} className={input}>
            <option value="name">{tr(locale, "Titre", "Title")}</option><option value="avail">{tr(locale, "Disponible", "Available")}</option><option value="reserved">{tr(locale, "Réservé", "Reserved")}</option><option value="last">{tr(locale, "Dernier mouvement", "Last movement")}</option>
          </select>
        </label>
        <label className="grid gap-1">{tr(locale, "Ordre", "Order")}
          <select name="sdir" defaultValue={sp.sdir === "desc" ? "desc" : "asc"} className={input}><option value="asc">{tr(locale, "Croissant", "Ascending")}</option><option value="desc">{tr(locale, "Décroissant", "Descending")}</option></select>
        </label>
        <button className="h-10 rounded-md bg-primary px-4 text-primary-foreground">{tr(locale, "Filtrer", "Filter")}</button>
        <Link href={action + (resetQs ? `?${resetQs}` : "")} className="inline-flex h-10 items-center rounded-md border px-4">{tr(locale, "Réinitialiser", "Reset")}</Link>
      </form>
      <p className="text-sm text-muted-foreground">{data.total} {tr(locale, "création(s)", "creation(s)")}</p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-2 py-2">{tr(locale, "Création", "Creation")}</th>{supName && <th className="px-2">{tr(locale, "Partenaire", "Partner")}</th>}<th className="px-2">Total</th><th className="px-2">{tr(locale, "Réservé", "Reserved")}</th><th className="px-2">{tr(locale, "Dispo.", "Avail.")}</th><th className="px-2">{tr(locale, "Dernier mouvement", "Last movement")}</th><th className="px-2">{tr(locale, "Réservations actives", "Active holds")}</th>{adjust && <th className="px-2">Actions</th>}</tr></thead>
          <tbody>{data.rows.map((r) => (
            <tr key={r.slug} className="border-b align-top">
              <td className="px-2 py-2 font-medium">{fr ? r.name : r.nameEn}{r.variants.length > 0 && <span className="block text-xs font-normal text-muted-foreground">{r.variants.map((v) => `${v.label} : ${v.stock - v.reserved}/${v.stock}`).join(" · ")}</span>}</td>
              {supName && <td className="px-2">{supName.get(r.supplierId ?? "") ?? "—"}</td>}
              <td className="px-2">{r.total}</td><td className="px-2">{r.reserved}</td><td className="px-2 font-medium">{r.avail}{r.low ? ` (${tr(locale, "bas", "low")})` : ""}</td>
              <td className="px-2 text-xs">{r.lastMove ? dtf(r.lastMove) : "—"}</td>
              <td className="px-2 text-xs">{r.holds.join(" ; ") || "—"}</td>
              {adjust && <td className="px-2"><Link href={adjust(r.slug)} className="inline-flex min-h-9 items-center rounded-md border px-3 text-xs">{tr(locale, "Ajuster le stock", "Adjust stock")}</Link></td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <nav aria-label="Pagination stock" className="flex items-center gap-3 text-sm">
        {data.page > 1 && <Link className="underline" href={href(data.page - 1)}>← {tr(locale, "Précédent", "Previous")}</Link>}
        <span>Page {data.page} / {data.pages}</span>
        {data.page < data.pages && <Link className="underline" href={href(data.page + 1)}>{tr(locale, "Suivant", "Next")} →</Link>}
      </nav>
    </div>
  );
}
