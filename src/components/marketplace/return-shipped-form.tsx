import { confirmReturnShippedAction } from "@/app/[locale]/account/orders/return-actions";
import { buttonVariants } from "@/components/ui/button";
import { tr } from "@/lib/tr";

export function ReturnShippedForm({ id, locale }: { id: string; locale: "fr" | "en" }) {
  const cls = "mt-1 block w-48 rounded-md border bg-background px-2 py-1.5 text-sm";
  return (
    <form action={confirmReturnShippedAction} className="flex flex-wrap items-end gap-2 pt-1">
      <input type="hidden" name="id" value={id} />
      <label className="text-xs">
        {tr(locale, "Transporteur", "Carrier")}
        <input name="carrier" required minLength={2} maxLength={60} className={cls} />
      </label>
      <label className="text-xs">
        {tr(locale, "Numéro de suivi", "Tracking number")}
        <input name="tracking" required minLength={3} maxLength={60} className={cls} />
      </label>
      <button type="submit" className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Confirmer l'expédition du retour", "Confirm return shipment")}</button>
    </form>
  );
}
