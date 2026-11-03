"use client";

import { useState } from "react";
import { updateOrderAddress } from "@/app/[locale]/checkout/actions";
import { AddressFields } from "@/components/marketplace/address-fields";
import { type AddressFieldValues } from "@/lib/address";
import { getDict, type Locale } from "@/lib/i18n";

export function OrderAddressForm({
  locale,
  number,
  token,
  initial,
  error,
}: {
  locale: Locale;
  number: string;
  token?: string;
  initial: AddressFieldValues;
  error?: "required" | "postal";
}) {
  const t = getDict(locale);
  const [values, setValues] = useState(initial);
  return (
    <form action={updateOrderAddress} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="number" value={number} />
      {token && <input type="hidden" name="t" value={token} />}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error === "postal" ? t.checkout.errors.postal : t.me.required}
        </p>
      )}
      <AddressFields locale={locale} values={values} onChange={(p) => setValues((v) => ({ ...v, ...p }))} />
      <button type="submit" className="h-12 w-full rounded-md bg-black text-sm font-medium text-white hover:bg-black/85">
        {t.me.saveContinue}
      </button>
    </form>
  );
}
