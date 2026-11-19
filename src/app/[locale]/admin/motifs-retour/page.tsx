import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { listReturnReasons } from "@/lib/config-lists";
import { tr } from "@/lib/tr";
import { ConfigTabs } from "../config-tabs";
import { DraftForm } from "../motifs/draft-form";
import { addReturnReasonAction, deleteReturnReasonsAction, moveReturnReasonAction, saveReturnReasonsAction, toggleReturnReasonsAction } from "../config-actions";

export const metadata = { title: "Motifs de retour", robots: { index: false } };

const btn = "inline-flex min-h-11 items-center rounded-md border px-3 text-sm";
const cell = "w-full min-w-48 rounded-md border bg-background px-2 py-1 text-sm";

export default async function AdminReturnReasons({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const rows = await listReturnReasons(db, false);
  const errors: Record<string, [string, string]> = {
    invalid: ["Les textes FR et EN sont obligatoires (3 caractères minimum).", "FR and EN texts are required (3 characters minimum)."],
    none: ["Sélectionnez au moins une ligne.", "Select at least one row."],
    used: ["Suppression impossible : une demande de retour utilise déjà ce motif. Désactivez-le à la place.", "Cannot delete: a return request already uses this reason. Disable it instead."],
  };
  const err = sp.error ? errors[sp.error] : null;
  return (
    <>
      <ConfigTabs locale={locale} current="motifs-retour" />
      <h2 className="text-2xl font-semibold text-primary">{tr(locale, "Motifs de retour", "Return reasons")}</h2>
      <p className="text-sm text-muted-foreground">{tr(locale, "Liste déroulante proposée au client pour demander un retour. « Photos » = photos obligatoires pour ce motif. Désactiver : le motif n'est plus proposé, les retours existants sont inchangés. Supprimer : impossible si un retour l'utilise.", "Dropdown offered to the customer when requesting a return. “Photos” = photos required for this reason. Disable: no longer offered, existing returns unchanged. Delete: not possible if a return uses it.")}</p>
      {sp.ok && <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm">{tr(locale, "Enregistré.", "Saved.")}</p>}
      {err && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">{tr(locale, err[0], err[1])}</p>}
      <DraftForm id="RETURN-CUSTOMER" requireSelection noSelectionMessage={tr(locale, "Sélectionnez au moins une ligne.", "Select at least one row.")} className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button className={btn} type="submit" formAction={saveReturnReasonsAction} data-needs-selection="" data-clears-draft="">{tr(locale, "Enregistrer", "Save")}</button>
          <button className={btn} type="submit" formAction={toggleReturnReasonsAction} data-needs-selection="">{tr(locale, "Désactiver / réactiver", "Disable / enable")}</button>
          <button className={btn} type="submit" formAction={deleteReturnReasonsAction} data-needs-selection="">{tr(locale, "Supprimer", "Delete")}</button>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr><th className="p-2"><span className="sr-only">{tr(locale, "Sélection", "Select")}</span></th><th className="p-2">FR</th><th className="p-2">EN</th><th className="p-2">Photos</th><th className="p-2">{tr(locale, "Statut", "Status")}</th><th className="p-2">{tr(locale, "Ordre", "Order")}</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t align-top ${r.active ? "" : "bg-muted/40"}`}>
                  <td className="p-2"><input type="checkbox" name="sel" value={r.id} aria-label={r.fr} className="size-5" /></td>
                  <td className="p-2"><input name={`fr_${r.id}`} defaultValue={r.fr} maxLength={200} className={cell} aria-label="FR" /></td>
                  <td className="p-2"><input name={`en_${r.id}`} defaultValue={r.en} maxLength={200} className={cell} aria-label="EN" /></td>
                  <td className="p-2"><input type="checkbox" name={`photos_${r.id}`} defaultChecked={r.requiresPhotos} className="size-5" aria-label={tr(locale, "Photos obligatoires", "Photos required")} /></td>
                  <td className="p-2 text-xs">{r.active ? tr(locale, "Actif", "Active") : tr(locale, "Désactivé", "Disabled")}</td>
                  <td className="whitespace-nowrap p-2">
                    <button className={btn} type="submit" formAction={moveReturnReasonAction} name="move" value={`${r.id}:up`} aria-label={tr(locale, "Monter", "Move up")}>↑</button>
                    <button className={btn} type="submit" formAction={moveReturnReasonAction} name="move" value={`${r.id}:down`} aria-label={tr(locale, "Descendre", "Move down")}>↓</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DraftForm>
      <DraftForm id="RETURN-CUSTOMER-add" action={addReturnReasonAction} className="grid gap-2 rounded-lg border border-dashed p-3 sm:grid-cols-2">
        <label className="block text-sm">FR<input name="fr" required minLength={3} maxLength={200} className={cell} /></label>
        <label className="block text-sm">EN<input name="en" required minLength={3} maxLength={200} className={cell} /></label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="requiresPhotos" className="size-5" />{tr(locale, "Photos obligatoires", "Photos required")}</label>
        <div className="sm:col-span-2"><button className={btn} type="submit" data-clears-draft="">{tr(locale, "Ajouter un motif", "Add a reason")}</button></div>
      </DraftForm>
    </>
  );
}
