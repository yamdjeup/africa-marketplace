"use client";

import { cancelMySubOrder } from "@/app/[locale]/account/orders/cancel-actions";
import { ConfirmButton } from "@/components/admin/table-widgets";

export function CancelSubOrderButton({ id, locale }: { id: string; locale: "fr" | "en" }) {
  const en = locale === "en";
  return (
    <form action={cancelMySubOrder}>
      <input type="hidden" name="id" value={id} />
      <ConfirmButton
        en={en}
        title={en ? "Cancel this parcel?" : "Annuler ce colis ?"}
        message={en ? "This cannot be undone. You will be refunded in full." : "Cette action est irréversible. Vous serez remboursé intégralement."}
        confirmLabel={en ? "Cancel parcel" : "Annuler le colis"}
        cancelLabel={en ? "Keep my order" : "Garder ma commande"}
        className="rounded-md border border-destructive px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
      >
        {en ? "Cancel my order" : "Annuler ma commande"}
      </ConfirmButton>
    </form>
  );
}
