"use client";

import { useRef, useState } from "react";
import { inputCls } from "@/components/fournisseur/parts";

type Action = "SUSPEND" | "REACTIVATE" | "REVOKE";

const LABELS: Record<Action, [string, string]> = {
  SUSPEND: ["Suspendre", "Suspend"],
  REACTIVATE: ["Réactiver", "Reactivate"],
  REVOKE: ["Révoquer définitivement", "Revoke permanently"],
};
const CONFIRM: Record<Action, [string, string]> = {
  SUSPEND: ["Confirmer la suspension ?", "Confirm the suspension?"],
  REACTIVATE: ["Confirmer la réactivation ?", "Confirm the reactivation?"],
  REVOKE: ["Confirmer la révocation définitive ?", "Confirm the permanent revocation?"],
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
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-2" onSubmit={(e) => { if (!open) { e.preventDefault(); if (formRef.current?.reportValidity()) setOpen(true); } }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <label className="min-w-48 flex-1 basis-full sm:basis-auto">
        {locale === "en" ? "Reason" : "Motif"}
        <input name="reason" required={choice !== "REACTIVATE"} className={inputCls} />
      </label>
      <label>
        {locale === "en" ? "Action" : "Action"}
        <select name="action" value={choice} onChange={(e) => setChoice(e.target.value as Action)} className={inputCls}>
          {options.map((o) => <option key={o} value={o}>{LABELS[o][i]}</option>)}
        </select>
      </label>
      <button type="submit" className="min-h-11 rounded-md border px-4">{locale === "en" ? "Submit" : "Valider"}</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={CONFIRM[choice][i]} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-lg bg-background p-5 shadow-lg">
            <p className="font-medium">{CONFIRM[choice][i]}</p>
            {choice === "REVOKE" && (
              <label className="flex min-h-11 items-center gap-2">
                <input type="checkbox" name="anonymize" className="size-5" />
                {locale === "en" ? "Anonymise the profile (GDPR); orders and payments kept" : "Anonymiser le profil (RGPD) ; commandes et paiements conservés"}
              </label>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-md border px-4">{locale === "en" ? "No" : "Non"}</button>
              <button type="button" autoFocus onClick={() => formRef.current?.requestSubmit()} className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">{locale === "en" ? "Yes" : "Oui"}</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
