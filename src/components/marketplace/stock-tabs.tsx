import Link from "next/link";
import type { StockTab } from "@/lib/stock-list";
import { tr } from "@/lib/tr";
import type { Locale } from "@/lib/i18n";

/** Onglets Stocks / Journal (même style que les onglets de statut des listes) ; l'onglet actif est dans l'URL (`tab`). */
export function StockTabs({ locale, base, tab }: { locale: Locale; base: string; tab: StockTab }) {
  const items: [StockTab, string][] = [["stock", tr(locale, "Stocks", "Stock")], ["journal", tr(locale, "Journal des mouvements de stock", "Stock movement log")]];
  return (
    <nav className="flex flex-wrap gap-2" aria-label={tr(locale, "Sections du stock", "Stock sections")}>
      {items.map(([k, l]) => (
        <Link key={k} href={`${base}?tab=${k}`} aria-current={k === tab ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm ${k === tab ? "bg-primary text-primary-foreground" : ""}`}>{l}</Link>
      ))}
    </nav>
  );
}