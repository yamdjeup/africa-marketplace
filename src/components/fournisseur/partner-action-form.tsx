"use client";

import { useState } from "react";
import { inputCls } from "@/components/fournisseur/parts";

type Action = "SUSPEND" | "REACTIVATE" | "REVOKE";

const LABELS: Record<Action, [string, string]> = {
  SUSPEND: ["Suspendre", "Suspend"],
  REACTIVATE: ["Réactiver", "Reactivate"],
  REVOKE: ["Révoquer définitivement", "Revoke permanently"],
};

export function PartnerActionForm({
  id,
  status,
  locale,
  action,
}: {
  id: string;
  status: "ACTIVE" | "SUSPENDED";
  locale: "fr" | "en";
  action: (formData: FormData) => void | Promise<void>;
}) {
  const i = locale === "en" ? 1 : 0;
  const options: Action[] = status === "ACTIVE" ? ["SUSPEND", "REVOKE"] : ["REACTIVATE", "REVOKE"];
  const [choice, setChoice] = useState<Action>(options[0]);
  const [open, setOpen] = useState(false);
  return (
    <form action={action} className="inline-block">
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 whitespace-nowrap rounded-md border px-3 text-sm">{locale === "en" ? "Status…" : "Statut…"}</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={LABELS[choice][i]} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 text-left">
          <div className="w-full max-w-sm space-y-4 rounded-lg bg-background p-5 shadow-lg">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="locale" value={locale} />
            <label className="block">
              {locale === "en" ? "Action" : "Action"}
              <select name="action" value={choice} onChange={(e) => setChoice(e.target.value as Action)} className={inputCls}>
                {options.map((o) => <option key={o} value={o}>{LABELS[o][i]}</option>)}
              </select>
            </label>
            <label className="block">
              {locale === "en" ? "Reason" : "Motif"}{choice !== "REACTIVATE" && " *"}
              <input name="reason" required={choice !== "REACTIVATE"} autoFocus className={inputCls} />
            </label>
            {choice === "REVOKE" && (
              <label className="flex min-h-11 items-center gap-2">
                <input type="checkbox" name="anonymize" className="size-5" />
                {locale === "en" ? "Anonymise the profile (GDPR); orders and payments kept" : "Anonymiser le profil (RGPD) ; commandes et paiements conservés"}
              </label>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-md border px-4">{locale === "en" ? "Cancel" : "Annuler"}</button>
              <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">{locale === "en" ? "Submit" : "Valider"}</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}