import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { listCarriers, paginateCarriers } from "@/lib/config-lists";
import { tr } from "@/lib/tr";
import { ConfigTabs } from "../config-tabs";
import { DraftForm } from "../motifs/draft-form";
import { addCarrierAction, deleteCarriersAction, moveCarrierAction, saveCarriersAction, toggleCarriersAction } from "../config-actions";

export const metadata = { title: "Transporteurs", robots: { index: false } };

const btn = "inline-flex min-h-11 items-center rounded-md border px-3 text-sm";
const cell = "w-full min-w-48 rounded-md border bg-background px-2 py-1 text-sm";

export default async function AdminCarriers({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ ok?: string; error?: string; q?: string; page?: string; size?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const all = await listCarriers(db, false);
  const { q, size, matches, pages, page, rows } = paginateCarriers(all, sp);
  const href = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), size: String(size), page: String(p) })}`;
  const pager = (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-2 text-sm">
      {page > 1 ? <a className={btn} href={href(page - 1)}>{tr(locale, "← Précédent", "← Previous")}</a> : <span className={`${btn} opacity-50`}>{tr(locale, "← Précédent", "← Previous")}</span>}
      <span>{tr(locale, `Page ${page} / ${pages}`, `Page ${page} / ${pages}`)}</span>
      {page < pages ? <a className={`${btn} bg-primary text-primary-foreground`} href={href(page + 1)}>{tr(locale, "Suivant →", "Next →")}</a> : <span className={`${btn} opacity-50`}>{tr(locale, "Suivant →", "Next →")}</span>}
    </nav>
  );
  const errors: Record<string, [string, string]> = {
    invalid: ["Nom obligatoire (2 caractères minimum).", "Name required (2 characters minimum)."],
    exists: ["Ce transporteur existe déjà.", "This carrier already exists."],
    none: ["Sélectionnez au moins une ligne.", "Select at least one row."],
    used: ["Suppression impossible : un colis utilise déjà ce transporteur. Désactivez-le à la place.", "Cannot delete: a parcel already uses this carrier. Disable it instead."],
  };
  const err = sp.error ? errors[sp.error] : null;
  return (
    <>
      <ConfigTabs locale={locale} current="transporteurs" />
      <h2 className="text-2xl font-semibold text-primary">{tr(locale, "Transporteurs", "Carriers")}</h2>
      <p className="text-sm text-muted-foreground">{tr(locale, "Liste proposée aux créateurs à l'expédition (« Autre » reste toujours disponible). Désactiver : n'est plus proposé, les colis existants sont inchangés. Supprimer : impossible si un colis l'utilise.", "List offered to creators when shipping (“Other” is always available). Disable: no longer offered, existing parcels unchanged. Delete: not possible if a parcel uses it.")}</p>
      {sp.ok && <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm">{tr(locale, "Enregistré.", "Saved.")}</p>}
      {err && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">{tr(locale, err[0], err[1])}</p>}
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="block text-sm">{tr(locale, "Rechercher", "Search")}<input name="q" defaultValue={q} className={cell} /></label>
        <label className="block text-sm">{tr(locale, "Par page", "Per page")}<select name="size" defaultValue={String(size)} className={cell}><option value="50">50</option><option value="100">100</option></select></label>
        <button className={btn} type="submit">{tr(locale, "Filtrer", "Filter")}</button>
        <span className="text-xs text-muted-foreground">{matches.length} / {all.length}</span>
      </form>
      {pager}
      <DraftForm id="CARRIERS" requireSelection noSelectionMessage={tr(locale, "Sélectionnez au moins une ligne.", "Select at least one row.")} className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button className={btn} type="submit" formAction={saveCarriersAction} data-needs-selection="" data-clears-draft="">{tr(locale, "Enregistrer", "Save")}</button>
          <button className={btn} type="submit" formAction={toggleCarriersAction} data-needs-selection="">{tr(locale, "Désactiver / réactiver", "Disable / enable")}</button>
          <button className={btn} type="submit" formAction={deleteCarriersAction} data-needs-selection="">{tr(locale, "Supprimer", "Delete")}</button>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr><th className="p-2"><span className="sr-only">{tr(locale, "Sélection", "Select")}</span></th><th className="p-2">{tr(locale, "Nom", "Name")}</th><th className="p-2">{tr(locale, "Statut", "Status")}</th><th className="p-2">{tr(locale, "Ordre", "Order")}</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t align-top ${r.active ? "" : "bg-muted/40"}`}>
                  <td className="p-2"><input type="checkbox" name="sel" value={r.id} aria-label={r.name} className="size-5" /></td>
                  <td className="p-2"><input name={`name_${r.id}`} defaultValue={r.name} maxLength={60} className={cell} aria-label={tr(locale, "Nom", "Name")} /></td>
                  <td className="p-2 text-xs">{r.active ? tr(locale, "Actif", "Active") : tr(locale, "Désactivé", "Disabled")}</td>
                  <td className="whitespace-nowrap p-2">
                    <button className={btn} type="submit" formAction={moveCarrierAction} name="move" value={`${r.id}:up`} aria-label={tr(locale, "Monter", "Move up")}>↑</button>
                    <button className={btn} type="submit" formAction={moveCarrierAction} name="move" value={`${r.id}:down`} aria-label={tr(locale, "Descendre", "Move down")}>↓</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DraftForm>
      {pager}
      <DraftForm id="CARRIERS-add" action={addCarrierAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3">
        <label className="block text-sm">{tr(locale, "Nom", "Name")}<input name="name" required minLength={2} maxLength={60} className={cell} /></label>
        <button className={btn} type="submit" data-clears-draft="">{tr(locale, "Ajouter un transporteur", "Add a carrier")}</button>
      </DraftForm>
    </>
  );
}
