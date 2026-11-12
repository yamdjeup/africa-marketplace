import { tr } from "@/lib/tr";
import type { Locale } from "@/lib/i18n";

/** Libellés du sélecteur de période commun (toutes les dates / aujourd'hui / 7 j / 30 j / plage personnalisée). */
export const periodLabels = (locale: Locale) => ({
  decision: tr(locale, "Période", "Period"), today: tr(locale, "Aujourd'hui", "Today"), d7: tr(locale, "7 jours", "7 days"), d30: tr(locale, "30 jours", "30 days"),
  custom: tr(locale, "Plage personnalisée", "Custom range"), all: tr(locale, "Toutes les dates", "All dates"), from: tr(locale, "Du", "From"), to: tr(locale, "Au", "To"),
  invalid: tr(locale, "La date de début doit être antérieure ou égale à la date de fin.", "The start date must be on or before the end date."),
});

export const todayParis = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());