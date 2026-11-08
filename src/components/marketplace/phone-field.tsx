"use client";

import { useEffect, useId, useRef, useState } from "react";
import { COUNTRIES, countryByName } from "@/lib/address";
import { DIAL, formatNational, isE164, splitE164, toE164 } from "@/lib/phone";
import { pick, type Locale } from "@/lib/i18n";

const fieldClass = "h-12 border-0 border-b bg-transparent px-0 text-base outline-none focus:border-primary focus-visible:ring-0";
const FIRST = ["FR", "CM", "BE", "CI"];

// Drapeau SVG (Windows n'affiche pas les emoji de drapeaux).
export function Flag({ code, className = "h-4 w-6" }: { code: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`https://flagcdn.com/${code.toLowerCase()}.svg`} alt="" loading="lazy" className={`${className} rounded-[2px] object-cover`} />;
}

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Liste de pays recherchable avec drapeaux SVG (FR/CM/BE/CI en tête). `trigger` est le contenu du bouton d'ouverture. */
export function CountryPicker({ locale, value, onSelect, onlyDial, trigger, triggerClass, ariaLabel, id }: { locale: Locale; value: string; onSelect: (code: string) => void; onlyDial?: boolean; trigger: React.ReactNode; triggerClass: string; ariaLabel: string; id?: string }) {
  const fr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const all = COUNTRIES.filter((c) => !onlyDial || DIAL[c.code]).map((c) => ({ code: c.code, name: pick(locale, c.fr, c.en) }));
  const rest = all.filter((c) => !FIRST.includes(c.code)).sort((a, b) => a.name.localeCompare(b.name, locale));
  const first = FIRST.map((k) => all.find((c) => c.code === k)).filter((c): c is { code: string; name: string } => !!c);
  const needle = fold(q.trim());
  const list = [...first, ...rest].filter((c) => !needle || fold(c.name).includes(needle) || (DIAL[c.code] ?? "").startsWith(needle.replace("+", "")));

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button id={id} type="button" aria-label={ariaLabel} aria-expanded={open} aria-haspopup="listbox" onClick={() => { setOpen((o) => !o); setQ(""); }} className={triggerClass}>
        {trigger}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-72 max-w-[85vw] rounded-lg border bg-background shadow-xl">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} placeholder={fr ? "Rechercher un pays…" : "Search a country…"} className="w-full border-b bg-transparent px-3 py-3 text-base outline-none" />
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {list.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{fr ? "Aucun pays" : "No country"}</li>}
            {list.map((c) => (
              <li key={c.code} role="option" aria-selected={c.code === value}>
                <button type="button" className={`flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm hover:bg-muted ${c.code === value ? "bg-muted font-medium" : ""}`} onClick={() => { onSelect(c.code); setOpen(false); }}>
                  <Flag code={c.code} />
                  <span className="flex-1">{c.name}</span>
                  {DIAL[c.code] && <span className="text-muted-foreground">+{DIAL[c.code]}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Champ « Pays / Région » avec drapeau ; la valeur envoyée reste le nom du pays (champ `name`). */
export function CountryField({ locale, value, onChange, label, name = "country" }: { locale: Locale; value: string; onChange: (name: string) => void; label: string; name?: string }) {
  const known = countryByName(value);
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">{label} *</label>
      <CountryPicker
        id={id}
        locale={locale}
        value={known?.code ?? ""}
        onSelect={(code) => { const c = COUNTRIES.find((x) => x.code === code); if (c) onChange(pick(locale, c.fr, c.en)); }}
        ariaLabel={label}
        triggerClass="flex h-12 w-full items-center gap-3 border-b text-left text-base"
        trigger={<>{known && <Flag code={known.code} className="h-5 w-7" />}<span className="flex-1">{known ? pick(locale, known.fr, known.en) : value}</span><span aria-hidden className="text-xs">▾</span></>}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

/** Téléphone : pays (drapeau SVG, recherche) + numéro national ; valeur soumise en E.164 ; erreur intégrée sous le champ. */
export function PhoneField({ locale, country, value, onChange, label, note, name = "phone", required = true }: { locale: Locale; country: string; value: string; onChange?: (e164OrRaw: string) => void; label: string; note?: string; name?: string; required?: boolean }) {
  const fr = locale === "fr";
  const countryCode = countryByName(country)?.code ?? "FR";
  const initial = splitE164(value, countryCode);
  const [override, setOverride] = useState<string | null>(isE164(value) ? initial.code : null);
  const [national, setNational] = useState(formatNational(initial.code, initial.national));
  const [touched, setTouched] = useState(false);
  const errId = useId();
  const code = override ?? (DIAL[countryCode] ? countryCode : "FR");
  const e164 = toE164(code, national);
  const msg = fr ? "Numéro de téléphone invalide pour ce pays." : "Invalid phone number for this country.";
  const req = fr ? "Veuillez renseigner ce champ." : "Please fill in this field.";
  const error = national ? (e164 ? "" : msg) : touched && required ? req : "";

  function emit(c: string, n: string) {
    onChange?.(toE164(c, n) ?? n);
  }

  return (
    <div className="space-y-1">
      <label htmlFor={`${name}-national`} className="text-xs text-muted-foreground">{label}{required ? " *" : ""}</label>
      <div className="flex items-end gap-2">
        <CountryPicker
          locale={locale}
          value={code}
          onlyDial
          ariaLabel={fr ? "Choisir le pays (indicatif)" : "Choose country (dial code)"}
          triggerClass="flex h-12 shrink-0 items-center gap-2 border-b pr-1 text-base"
          trigger={<><Flag code={code} className="h-5 w-7" /><span>+{DIAL[code]}</span><span aria-hidden className="text-xs">▾</span></>}
          onSelect={(c) => { setOverride(c); const v = formatNational(c, national); setNational(v); emit(c, v); }}
        />
        <input
          id={`${name}-national`}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          value={national}
          placeholder={code === "FR" ? "6 12 34 56 78" : ""}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          onChange={(e) => { const v = formatNational(code, e.target.value); setNational(v); emit(code, v); }}
          onBlur={() => setTouched(true)}
          // L'envoi reste bloqué par la validité, mais l'infobulle native est remplacée par le message intégré.
          onInvalid={(e) => { e.preventDefault(); setTouched(true); }}
          ref={(el) => el?.setCustomValidity(national && !e164 ? msg : "")}
          className={`${fieldClass} w-full ${error ? "border-destructive" : ""}`}
        />
      </div>
      <input type="hidden" name={name} value={e164 ?? national} />
      {error && <p id={errId} role="alert" className="text-sm text-destructive">{error}</p>}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
