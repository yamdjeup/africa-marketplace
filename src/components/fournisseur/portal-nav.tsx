"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export function PortalNav({ locale }: { locale: Locale }) {
  const path = usePathname();
  const base = `/${locale}/fournisseur`;
  const items = [
    ["/tableau-de-bord", tr(locale, "Tableau de bord", "Dashboard")],
    ["/commandes", tr(locale, "Commandes", "Orders")],
    ["/oeuvres", tr(locale, "Œuvres et stock", "Works and stock")],
    ["/paiements", tr(locale, "Paiements", "Payments")],
    ["/profil", tr(locale, "Profil", "Profile")],
  ];
  return (
    <nav aria-label={tr(locale, "Espace partenaire", "Partner area")} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex gap-1 border-b md:flex-col md:border-b-0 md:border-r md:pr-2">
        {items.map(([href, label]) => {
          const active = path.startsWith(base + href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={base + href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center whitespace-nowrap px-3 text-sm ${active ? "border-b-2 border-accent font-semibold text-primary md:border-b-0 md:border-l-2" : "text-muted-foreground hover:text-primary"}`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
