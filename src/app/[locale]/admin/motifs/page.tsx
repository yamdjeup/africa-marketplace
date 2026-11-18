import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { listReasons, type ReasonKind } from "@/lib/refusal-reasons";
import { tr } from "@/lib/tr";
import { addReasonAction, deleteReasonsAction, moveReasonAction, saveReasonsAction, toggleReasonsAction } from "../motifs-actions";

export const metadata = { title: "Motifs de refus", robots: { index: false } };

const btn = "inline-flex min-h-11 items-center rounded-md border px-3 text-sm";
const cell = "w-full min-w-40 rounded-md border bg-background px-2 py-1 text-sm";

export default async function AdminReasons({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const groups: { kind: ReasonKind; title: string }[] = [
    { kind: "ORDER", title: tr(locale, "Refus de commande", "Order refusal") },
    { kind: "RETURN", title: tr(locale, "Refus de retour", "Return refusal") },
  ];
  const lists = await Promise.all(groups.map((g) => listReasons(db, g.kind, false)));
  const errors: Record<string, [string, string]> = {
    invalid: ["Les quatre textes sont obligatoires (3 caractères minimum).", "All four texts are required (3 characters minimum)."],
    none: ["Sélectionnez au moins une ligne.", "Select at least one row."],
    used: ["Suppression impossible : une commande ou un retour utilise déjà ce motif.", "Cannot delete: an order or return already uses this reason."],
  };
  const err = sp.error ? errors[sp.error] : null;
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Motifs de refus", "Refusal reasons")}</h1>
      <p className="text-sm text-muted-foreground">{tr(locale, "Code = libellé de la liste déroulante du créateur. Mail = phrase insérée dans l'e-mail au client. Désactiver : le motif n'est plus proposé pour les futurs refus, l'existant est inchangé. Supprimer : impossible si une commande ou un retour l'utilise.", "Code = label in the creator's dropdown. Mail = sentence inserted in the customer e-mail. Disable: the reason is no longer offered for future refusals, existing ones are unchanged. Delete: not possible if an order or return uses it.")}</p>
      {sp.ok && <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm">{tr(locale, "Enregistré.", "Saved.")}</p>}
      {err && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">{tr(locale, err[0], err[1])}</p>}
      {groups.map((g, gi) => (
        <section key={g.kind} className="space-y-3">
          <h2 className="text-xl font-semibold">{g.title}</h2>
          <form className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button className={btn} type="submit" formAction={saveReasonsAction}>{tr(locale, "Enregistrer", "Save")}</button>
              <button className={btn} type="submit" formAction={toggleReasonsAction}>{tr(locale, "Désactiver / réactiver", "Disable / enable")}</button>
              <button className={btn} type="submit" formAction={deleteReasonsAction}>{tr(locale, "Supprimer", "Delete")}</button>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="p-2"><span className="sr-only">{tr(locale, "Sélection", "Select")}</span></th>
                    <th className="p-2">Code FR</th><th className="p-2">Code EN</th><th className="p-2">Mail FR</th><th className="p-2">Mail EN</th>
                    <th className="p-2">{tr(locale, "Statut", "Status")}</th><th className="p-2">{tr(locale, "Ordre", "Order")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lists[gi].map((r) => (
                    <tr key={r.id} className={`border-t align-top ${r.active ? "" : "bg-muted/40"}`}>
                      <td className="p-2"><input type="checkbox" name="sel" value={r.id} aria-label={r.fr} className="size-5" /></td>
                      <td className="p-2"><input name={`fr_${r.id}`} defaultValue={r.fr} maxLength={200} className={cell} aria-label="Code FR" /></td>
                      <td className="p-2"><input name={`en_${r.id}`} defaultValue={r.en} maxLength={200} className={cell} aria-label="Code EN" /></td>
                      <td className="p-2"><input name={`mailFr_${r.id}`} defaultValue={r.mailFr || r.fr} maxLength={300} className={cell} aria-label="Mail FR" /></td>
                      <td className="p-2"><input name={`mailEn_${r.id}`} defaultValue={r.mailEn || r.en} maxLength={300} className={cell} aria-label="Mail EN" /></td>
                      <td className="p-2 text-xs">{r.active ? tr(locale, "Actif", "Active") : tr(locale, "Désactivé", "Disabled")}</td>
                      <td className="whitespace-nowrap p-2">
                        <button className={btn} type="submit" formAction={moveReasonAction} name="move" value={`${r.id}:up`} aria-label={tr(locale, "Monter", "Move up")}>↑</button>
                        <button className={btn} type="submit" formAction={moveReasonAction} name="move" value={`${r.id}:down`} aria-label={tr(locale, "Descendre", "Move down")}>↓</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </form>
          <form action={addReasonAction} className="grid gap-2 rounded-lg border border-dashed p-3 sm:grid-cols-2">
            <input type="hidden" name="kind" value={g.kind} />
            <label className="block text-sm">Code FR<input name="fr" required minLength={3} maxLength={200} className={cell} /></label>
            <label className="block text-sm">Code EN<input name="en" required minLength={3} maxLength={200} className={cell} /></label>
            <label className="block text-sm">Mail FR<input name="mailFr" required minLength={3} maxLength={300} className={cell} /></label>
            <label className="block text-sm">Mail EN<input name="mailEn" required minLength={3} maxLength={300} className={cell} /></label>
            <div className="sm:col-span-2"><button className={btn} type="submit">{tr(locale, "Ajouter un motif", "Add a reason")}</button></div>
          </form>
        </section>
      ))}
    </>
  );
}
