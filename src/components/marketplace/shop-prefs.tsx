"use client";

import { useEffect, useState } from "react";
import { getDict, type Locale } from "@/lib/i18n";

const KEY = "epomta-shop-pref";
type Pref = "all" | "art" | "fashion";

// Préférence simulée : enregistrée sur l'appareil uniquement, sans effet sur l'affichage.
export function ShopPrefs({ locale }: { locale: Locale }) {
  const t = getDict(locale).f10;
  const [value, setValue] = useState<Pref>("all");
  useEffect(() => {
    const id = setTimeout(() => {
      const v = localStorage.getItem(KEY);
      if (v === "art" || v === "fashion") setValue(v);
    }, 0);
    return () => clearTimeout(id);
  }, []);
  const options: [Pref, string][] = [
    ["all", t.prefAll],
    ["art", t.prefArt],
    ["fashion", t.prefFashion],
  ];
  return (
    <fieldset className="space-y-1">
      <legend className="sr-only">{t.prefTitle}</legend>
      {options.map(([v, label]) => (
        <label key={v} className="flex min-h-14 cursor-pointer items-center justify-between border-b px-1 text-sm">
          {label}
          <input
            type="radio"
            name="shop-pref"
            value={v}
            checked={value === v}
            onChange={() => {
              setValue(v);
              localStorage.setItem(KEY, v);
            }}
            className="size-5 accent-black"
          />
        </label>
      ))}
      <p className="py-3 text-xs text-muted-foreground">{t.prefText}</p>
    </fieldset>
  );
}
