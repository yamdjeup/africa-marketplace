import { requestReturnAction } from "@/app/[locale]/account/orders/return-actions";
import { buttonVariants } from "@/components/ui/button";
import { tr } from "@/lib/tr";

export function ReturnRequestForm({ id, locale }: { id: string; locale: "fr" | "en" }) {
  return (
    <form action={requestReturnAction} className="flex flex-wrap items-end gap-2 pt-1">
      <input type="hidden" name="id" value={id} />
      <label className="text-xs">
        {tr(locale, "Motif du retour", "Reason for return")}
        <input name="reason" required minLength={3} maxLength={1000} className="mt-1 block w-64 rounded-md border bg-background px-2 py-1.5 text-sm" />
      </label>
      <button type="submit" className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Demander un retour", "Request a return")}</button>
    </form>
  );
}
