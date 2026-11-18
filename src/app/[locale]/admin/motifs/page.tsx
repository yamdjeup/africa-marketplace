import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { inputCls } from "@/components/fournisseur/parts";
import { listReasons, type ReasonKind } from "@/lib/refusal-reasons";
import { tr } from "@/lib/tr";
import { addReasonAction, editReasonAction, moveReasonAction, toggleReasonAction } from "../motifs-actions";

export const metadata = { title: "Motifs de refus", robots: { index: false } };

const btn = "inline-flex min-h-11 items-center rounded-md border px-3 text-sm";

export default async function AdminReasons({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const groups: { kind: ReasonKind; title: string }[] = [
    { kind: "ORDER", title: tr(locale, "Refus de commande", "Order refusal") },
    { kind: "RETURN", title: tr(locale, "Refus de retour", "Return refusal") },
  ];
  const lists = await Promise.all(groups.map((g) => listReasons(db, g.kind, false)));
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Motifs de refus", "Refusal reasons")}</h1>
      <p className="text-sm text-muted-foreground">{tr(locale, "Liste proposée aux créateurs. Un motif désactivé n'est plus proposé ; il n'est jamais supprimé. Le client voit uniquement le texte ci-dessous.", "List offered to creators. A disabled reason is no longer offered; it is never deleted. Customers only see the text below.")}</p>
      {sp.ok && <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm">{tr(locale, "Enregistré.", "Saved.")}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">{tr(locale, "Textes FR et EN obligatoires (3 caractères minimum).", "FR and EN texts are required (3 characters minimum).")}</p>}
      {groups.map((g, gi) => (
        <section key={g.kind} className="space-y-3">
          <h2 className="text-xl font-semibold">{g.title}</h2>
          <ul className="space-y-3">
            {lists[gi].map((r) => (
              <li key={r.id} className={`rounded-lg border p-3 ${r.active ? "" : "bg-muted/40"}`}>
                <form action={editReasonAction} className="grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="block text-sm">FR<input name="fr" defaultValue={r.fr} required minLength={3} maxLength={200} className={inputCls} /></label>
                  <label className="block text-sm">EN<input name="en" defaultValue={r.en} required minLength={3} maxLength={200} className={inputCls} /></label>
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <button className={btn} type="submit">{tr(locale, "Enregistrer", "Save")}</button>
                    <span className="text-xs text-muted-foreground">{r.active ? tr(locale, "Actif", "Active") : tr(locale, "Désactivé", "Disabled")}</span>
                  </div>
                </form>
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={moveReasonAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="dir" value="up" /><button className={btn} type="submit" aria-label={tr(locale, "Monter", "Move up")}>↑</button></form>
                  <form action={moveReasonAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="dir" value="down" /><button className={btn} type="submit" aria-label={tr(locale, "Descendre", "Move down")}>↓</button></form>
                  <form action={toggleReasonAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="active" value={r.active ? "0" : "1"} /><button className={btn} type="submit">{r.active ? tr(locale, "Désactiver", "Disable") : tr(locale, "Réactiver", "Enable")}</button></form>
                </div>
              </li>
            ))}
          </ul>
          <form action={addReasonAction} className="grid gap-2 rounded-lg border border-dashed p-3 sm:grid-cols-2">
            <input type="hidden" name="kind" value={g.kind} />
            <label className="block text-sm">FR<input name="fr" required minLength={3} maxLength={200} className={inputCls} /></label>
            <label className="block text-sm">EN<input name="en" required minLength={3} maxLength={200} className={inputCls} /></label>
            <div className="sm:col-span-2"><button className={btn} type="submit">{tr(locale, "Ajouter un motif", "Add a reason")}</button></div>
          </form>
        </section>
      ))}
    </>
  );
}
