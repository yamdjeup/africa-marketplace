"use client";

import { useState } from "react";
import { saveAddress } from "@/app/[locale]/account/actions";
import { AddressFields } from "@/components/marketplace/address-fields";
import { EMPTY_ADDRESS, type AddressFieldValues } from "@/lib/address";
import { getDict, type Locale } from "@/lib/i18n";

export type AddressValues = AddressFieldValues & { id?: string; isDefault: boolean };

export function AddressForm({ locale, address, next, error }: { locale: Locale; address?: AddressValues; next?: string; error?: "required" | "postal" }) {
  const t = getDict(locale).me;
  const [values, setValues] = useState<AddressFieldValues>(address ?? EMPTY_ADDRESS);

  return (
    <form action={saveAddress} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {address?.id && <input type="hidden" name="id" value={address.id} />}
      {next && <input type="hidden" name="next" value={next} />}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error === "postal" ? getDict(locale).checkout.errors.postal : t.required}
        </p>
      )}
      <AddressFields locale={locale} values={values} onChange={(p) => setValues((v) => ({ ...v, ...p }))} />
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="size-4 accent-primary" />
        {t.setDefault}
      </label>
      <button type="submit" className="h-12 w-full rounded-md bg-black text-sm font-medium text-white hover:bg-black/85">
        {t.saveContinue}
      </button>
    </form>
  );
}
