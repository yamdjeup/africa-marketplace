import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";

// Sous-onglets de l'onglet « Configuration » de l'administration.
export function ConfigTabs({ locale, current }: { locale: Locale; current: "motifs" | "transporteurs" | "motifs-retour" }) {
  const tabs = [
    ["motifs", tr(locale, "Motifs de refus", "Refusal reasons")],
    ["transporteurs", tr(locale, "Transporteurs", "Carriers")],
    ["motifs-retour", tr(locale, "Motifs de retour", "Return reasons")],
  ] as const;
  return (
    <div className="space-y-2">
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Configuration", "Configuration")}</h1>
      <nav className="flex flex-wrap gap-2" aria-label="Configuration">
        {tabs.map(([key, label]) => (
          <Link key={key} href={`/${locale}/admin/${key}`} aria-current={key === current ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm ${key === current ? "bg-primary text-primary-foreground" : ""}`}>{label}</Link>
        ))}
      </nav>
    </div>
  );
}
