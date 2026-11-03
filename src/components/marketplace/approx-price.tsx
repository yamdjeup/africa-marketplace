"use client";

import type { Locale } from "@/lib/i18n";
import { useRegion } from "@/lib/region";

// Conversion indicative sous le prix en EUR ; rien n'est affiché pour la région par défaut (EUR).
export function ApproxPrice({ cents, locale, className = "" }: { cents: number; locale: Locale; className?: string }) {
  const region = useRegion();
  if (region.currency === "EUR") return null;
  const amount = new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", {
    style: "currency",
    currency: region.currency,
    maximumFractionDigits: 0,
  }).format((cents / 100) * region.rate);
  return (
    <span className={`block text-xs font-normal text-muted-foreground ${className}`} title={locale === "en" ? "Indicative, payment in EUR" : "Indicatif, paiement en EUR"}>
      ≈ {amount} <span className="sr-only">{locale === "en" ? "indicative, payment in EUR" : "indicatif, paiement en EUR"}</span>
    </span>
  );
}
