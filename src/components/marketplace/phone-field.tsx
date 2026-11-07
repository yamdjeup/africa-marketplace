"use client";

import { useState } from "react";
import { COUNTRIES, countryByName } from "@/lib/address";
import { DIAL, flag, isE164, splitE164, toE164 } from "@/lib/phone";
import { pick, type Locale } from "@/lib/i18n";

const fieldClass = "h-11 border-0 border-b bg-transparent px-0 text-sm outline-none focus:border-primary focus-visible:ring-0";

/** Téléphone avec indicatif pays (drapeau + « +33 ») ; la valeur soumise est en E.164. */
export function PhoneField({ locale, country, value, onChange, label, note }: { locale: Locale; country: string; value: string; onChange: (e164OrRaw: string) => void; label: string; note?: string }) {
  const countryCode = countryByName(country)?.code ?? "FR";
  const initial = splitE164(value, countryCode);
  const [override, setOverride] = useState<string | null>(isE164(value) ? initial.code : null);
  const [national, setNational] = useState(initial.national);
  const code = override ?? (DIAL[countryCode] ? countryCode : "FR");
  const e164 = toE164(code, national);
  const options = COUNTRIES.filter((c) => DIAL[c.code]).sort((a, b) => pick(locale, a.fr, a.en).localeCompare(pick(locale, b.fr, b.en), locale));

  function emit(c: string, n: string) {
    onChange(toE164(c, n) ?? n);
  }

  return (
    <div className="space-y-1">
      <label htmlFor="af-phone" className="text-xs text-muted-foreground">{label} *</label>
      <div className="flex items-end gap-2">
        <select
          aria-label={locale === "fr" ? "Indicatif pays" : "Country code"}
          value={code}
          onChange={(e) => { setOverride(e.target.value); emit(e.target.value, national); }}
          className={`${fieldClass} w-32 shrink-0`}
        >
          {options.map((c) => (
            <option key={c.code} value={c.code}>{flag(c.code)} +{DIAL[c.code]}</option>
          ))}
        </select>
        <input
          id="af-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required
          value={national}
          onChange={(e) => {
            setNational(e.target.value);
            emit(code, e.target.value);
            e.target.setCustomValidity(toE164(code, e.target.value) ? "" : locale === "fr" ? "Numéro de téléphone invalide pour ce pays." : "Invalid phone number for this country.");
          }}
          ref={(el) => el?.setCustomValidity(national && !e164 ? (locale === "fr" ? "Numéro de téléphone invalide pour ce pays." : "Invalid phone number for this country.") : "")}
          className={`${fieldClass} w-full`}
        />
      </div>
      <input type="hidden" name="phone" value={e164 ?? national} />
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
