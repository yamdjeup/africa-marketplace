"use client";

import { cancelMySubOrder } from "@/app/[locale]/account/orders/cancel-actions";

export function CancelSubOrderButton({ id, locale }: { id: string; locale: "fr" | "en" }) {
  const en = locale === "en";
  const msg = en
    ? "Cancel this parcel? This cannot be undone. You will be refunded in full."
    : "Annuler ce colis ? Cette action est irréversible. Vous serez remboursé intégralement.";
  return (
    <form
      action={cancelMySubOrder}
      onSubmit={(e) => {
        if (!window.confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-md border border-destructive px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10">
        {en ? "Cancel my order" : "Annuler ma commande"}
      </button>
    </form>
  );
}
