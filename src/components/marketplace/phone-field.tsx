"use client";

import { useEffect, useRef, useState } from "react";
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

/** Téléphone : liste de pays recherchable (drapeau SVG, nom, +indicatif) ; valeur soumise en E.164, champ toujours national. */
export function PhoneField({ locale, country, value, onChange, label, note, name = "phone", required = true }: { locale: Locale; country: string; value: string; onChange?: (e164OrRaw: string) => void; label: string; note?: string; name?: string; required?: boolean }) {
  const fr = locale === "fr";
  const countryCode = countryByName(country)?.code ?? "FR";
  const initial = splitE164(value, countryCode);
  const [override, setOverride] = useState<string | null>(isE164(value) ? initial.code : null);
  const [national, setNational] = useState(formatNational(initial.code, initial.national));
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const code = override ?? (DIAL[countryCode] ? countryCode : "FR");
  const e164 = toE164(code, national);
  const msg = fr ? "Numéro de téléphone invalide pour ce pays." : "Invalid phone number for this country.";
  const req = fr ? "Veuillez renseigner ce champ." : "Please fill in this field.";

  const all = COUNTRIES.filter((c) => DIAL[c.code]).map((c) => ({ code: c.code, name: pick(locale, c.fr, c.en) }));
  const rest = all.filter((c) => !FIRST.includes(c.code)).sort((a, b) => a.name.localeCompare(b.name, locale));
  const first = FIRST.map((k) => all.find((c) => c.code === k)).filter((c): c is { code: string; name: string } => !!c);
  const needle = fold(q.trim());
  const list = [...first, ...rest].filter((c) => !needle || fold(c.name).includes(needle) || DIAL[c.code].startsWith(needle.replace("+", "")));

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  function emit(c: string, n: string) {
    onChange?.(toE164(c, n) ?? n);
  }

  return (
    <div className="space-y-1" ref={box}>
      <label htmlFor={`${name}-national`} className="text-xs text-muted-foreground">{label}{required ? " *" : ""}</label>
      <div className="relative flex items-end gap-2">
        <button
          type="button"
          aria-label={fr ? "Choisir le pays (indicatif)" : "Choose country (dial code)"}
          aria-expanded={open}
          onClick={() => { setOpen((o) => !o); setQ(""); }}
          className="flex h-12 shrink-0 items-center gap-2 border-b pr-1 text-base"
        >
          <Flag code={code} className="h-5 w-7" />
          <span>+{DIAL[code]}</span>
          <span aria-hidden className="text-xs">▾</span>
        </button>
        <input
          id={`${name}-national`}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          value={national}
          placeholder={code === "FR" ? "6 12 34 56 78" : ""}
          onChange={(e) => {
            const v = formatNational(code, e.target.value);
            setNational(v);
            emit(code, v);
          }}
          onInvalid={(e) => { const t = e.currentTarget; t.setCustomValidity(t.value ? msg : req); }}
          onInput={(e) => e.currentTarget.setCustomValidity("")}
          ref={(el) => el?.setCustomValidity(national && !e164 ? msg : "")}
          className={`${fieldClass} w-full`}
        />
        {open && (
          <div className="absolute left-0 top-full z-40 mt-1 w-72 max-w-[85vw] rounded-lg border bg-background shadow-xl">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={fr ? "Rechercher un pays…" : "Search a country…"}
              className="w-full border-b bg-transparent px-3 py-3 text-base outline-none"
            />
            <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
              {list.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{fr ? "Aucun pays" : "No country"}</li>}
              {list.map((c) => (
                <li key={c.code} role="option" aria-selected={c.code === code}>
                  <button
                    type="button"
                    className={`flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm hover:bg-muted ${c.code === code ? "bg-muted font-medium" : ""}`}
                    onClick={() => {
                      setOverride(c.code);
                      const v = formatNational(c.code, national);
                      setNational(v);
                      emit(c.code, v);
                      setOpen(false);
                    }}
                  >
                    <Flag code={c.code} />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-muted-foreground">+{DIAL[c.code]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <input type="hidden" name={name} value={e164 ?? national} />
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
