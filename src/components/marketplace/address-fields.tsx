"use client";

import { useEffect, useId, useRef, useState } from "react";
import { COUNTRIES, postalRule, type AddressFieldValues } from "@/lib/address";
import { getDict, pick, type Locale } from "@/lib/i18n";
import { useRegion } from "@/lib/region";
import { PhoneField, CountryField } from "@/components/marketplace/phone-field";

type Suggestion = { label: string; placeId?: string; street: string; houseNumber: string; postalCode: string; city: string; countryCode: string };

const fieldClass = "h-11 w-full border-0 border-b bg-transparent px-0 text-sm outline-none focus:border-primary focus-visible:ring-0";

/** Pays affiché par défaut : celui du sélecteur de région (F2). */
export function useDefaultCountry(locale: Locale) {
  const region = useRegion();
  return pick(locale, region.fr, region.en);
}

export function AddressFields({ locale, values, onChange }: { locale: Locale; values: AddressFieldValues; onChange: (patch: Partial<AddressFieldValues>) => void }) {
  const t = getDict(locale).me;
  const defaultCountry = useDefaultCountry(locale);
  const country = values.country || defaultCountry;
  const rule = postalRule(country);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function search(q: string) {
    setQuery(q);
    clearTimeout(timer.current);
    if (q.trim().length < 3) {
      setItems([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address/suggest?locale=${locale}&country=${encodeURIComponent(country)}&q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setItems(data.suggestions ?? []);
        setOpen(true);
      } catch {
        setItems([]);
      }
    }, 350);
  }

  async function pick_(s: Suggestion) {
    let full: Suggestion | null = s;
    if (s.placeId) {
      try {
        const res = await fetch(`/api/address/suggest?locale=${locale}&placeId=${encodeURIComponent(s.placeId)}`);
        full = ((await res.json()) as { suggestion?: Suggestion | null }).suggestion ?? null;
      } catch {
        full = null;
      }
    }
    setOpen(false);
    setItems([]);
    if (!full) return;
    const c = COUNTRIES.find((x) => x.code === full.countryCode);
    onChange({
      line1: full.street || values.line1,
      houseNumber: full.houseNumber,
      postalCode: full.postalCode,
      city: full.city,
      ...(c ? { country: pick(locale, c.fr, c.en) } : {}),
    });
    setQuery("");
  }

  const input = (name: keyof AddressFieldValues, label: string, ac: string, opts: { required?: boolean; type?: string; pattern?: string; title?: string; inputMode?: "numeric" | "tel" } = {}) => (
    <div className="space-y-1">
      <label htmlFor={`af-${name}`} className="text-xs text-muted-foreground">
        {label}
        {opts.required ? " *" : ""}
      </label>
      <input
        id={`af-${name}`}
        name={name}
        type={opts.type ?? "text"}
        autoComplete={ac}
        required={opts.required}
        pattern={opts.pattern}
        title={opts.title}
        inputMode={opts.inputMode}
        value={values[name]}
        onChange={(e) => onChange({ [name]: e.target.value })}
        className={fieldClass}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {input("firstName", t.firstName, "given-name", { required: true })}
      {input("lastName", t.lastName, "family-name", { required: true })}
      <CountryField locale={locale} value={country} onChange={(c) => onChange({ country: c })} label={t.countryRegion} />
      <div className="relative space-y-1">
        <label htmlFor="af-search" className="text-xs text-muted-foreground">
          {t.searchAddress}
        </label>
        <input
          id="af-search"
          type="search"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={(e) => search(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className={fieldClass}
        />
        {open && items.length > 0 && (
          <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow-md">
            {items.map((s, i) => (
              <li key={`${s.label}-${i}`} role="option" aria-selected="false">
                <button type="button" onClick={() => pick_(s)} className="min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-muted">
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {input("line1", t.line1, "address-line1", { required: true })}
      <div className="grid grid-cols-2 gap-4">
        {input("houseNumber", t.houseNumber, "off")}
        {input("box", t.box, "off")}
      </div>
      {input("line2", t.line2, "address-line2")}
      <div className="grid grid-cols-[2fr_3fr] gap-4">
        {input("postalCode", `${t.postalCode}${rule ? "" : ` ${t.postalOptional}`}`, "postal-code", {
          required: Boolean(rule),
          pattern: rule?.re,
          title: rule ? t.postalFormat(rule.example) : undefined,
        })}
        {input("city", t.city, "address-level2", { required: true })}
      </div>
      <PhoneField locale={locale} country={country} value={values.phone} onChange={(phone) => onChange({ phone })} label={t.phone} note={t.phoneNote} />
    </div>
  );
}
