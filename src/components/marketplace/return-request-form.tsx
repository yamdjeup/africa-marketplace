import { requestReturnAction } from "@/app/[locale]/account/orders/return-actions";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { listReturnReasons } from "@/lib/config-lists";
import { tr } from "@/lib/tr";

export async function ReturnRequestForm({ id, locale }: { id: string; locale: "fr" | "en" }) {
  const reasons = await listReturnReasons(db).catch(() => []);
  return (
    <form action={requestReturnAction} encType="multipart/form-data" className="flex flex-wrap items-end gap-2 pt-1">
      <p className="w-full text-xs text-muted-foreground">{tr(locale, "Les frais de livraison ne sont pas remboursés.", "Delivery fees are not refunded.")}</p>
      <input type="hidden" name="id" value={id} />
      <label className="text-xs">
        {tr(locale, "Pourquoi souhaitez-vous retourner cet article ? *", "Why do you want to return this item? *")}
        <select name="reasonId" required defaultValue="" className="mt-1 block w-72 rounded-md border bg-background px-2 py-1.5 text-sm">
          <option value="" disabled>{tr(locale, "Sélectionnez un motif", "Select a reason")}</option>
          {reasons.map((r) => <option key={r.id} value={r.id}>{locale === "en" ? r.en : r.fr}{r.requiresPhotos ? " *" : ""}</option>)}
        </select>
      </label>
      <label className="text-xs">
        {tr(locale, "Informations complémentaires (facultatif)", "Additional information (optional)")}
        <input name="reason" maxLength={900} className="mt-1 block w-64 rounded-md border bg-background px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs">
        {tr(locale, "Photos (5 max, 5 Mo chacune)", "Photos (up to 5, 5 MB each)")}
        <input name="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" className="mt-1 block w-64 text-sm" />
      </label>
      <p className="w-full text-xs text-muted-foreground">{tr(locale, "* Photos obligatoires pour ce motif.", "* Photos are required for this reason.")}</p>
      <button type="submit" className={buttonVariants({ variant: "outline", className: "min-h-11" })}>{tr(locale, "Demander un retour", "Request a return")}</button>
    </form>
  );
}
