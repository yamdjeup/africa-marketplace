"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDict, type Locale } from "@/lib/i18n";

const KEY = "epomta-alert-prefs";
type Prefs = { email: boolean; promo: boolean };

function Switch({ id, label, checked, disabled, onChange, hint }: { id: string; label: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <label htmlFor={id} className={disabled ? "text-muted-foreground" : ""}>
        {label}
        {hint && <span className="ml-2 text-xs">{hint}</span>}
      </label>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-muted-foreground/40 transition-colors checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring relative before:absolute before:left-0.5 before:top-0.5 before:size-5 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-5"
      />
    </div>
  );
}

// Préférences simulées : stockées sur l'appareil, aucun envoi réel (démo privée).
export function AlertsForm({ locale }: { locale: Locale }) {
  const w = getDict(locale).wishlist;
  const [prefs, setPrefs] = useState<Prefs>({ email: false, promo: false });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setPrefs({ email: false, promo: false, ...JSON.parse(raw) });
    } catch {}
  }, []);
  const update = (p: Partial<Prefs>) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href={`/${locale}/favoris`} aria-label={w.back} className="inline-flex size-11 items-center justify-center text-2xl">
        <span aria-hidden="true">←</span>
      </Link>
      <h1 className="font-heading text-3xl font-normal text-primary">{w.alertsTitle}</h1>
      <section aria-labelledby="via" className="divide-y border-y">
        <h2 id="via" className="py-4 text-sm text-muted-foreground">{w.alertsVia}</h2>
        <Switch id="al-push" label={w.push} checked={false} disabled hint={w.soon} />
        <Switch id="al-email" label={w.email} checked={prefs.email} onChange={(v) => update({ email: v })} />
      </section>
      <section aria-labelledby="more" className="divide-y border-y">
        <h2 id="more" className="py-4 text-sm font-semibold">{w.more}</h2>
        <Switch id="al-promo" label={w.promo} checked={prefs.promo} onChange={(v) => update({ promo: v })} />
      </section>
      <p className="text-xs text-muted-foreground">{w.simulated}</p>
    </div>
  );
}
