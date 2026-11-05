import Link from "next/link";
import { CartLink } from "@/components/marketplace/cart-link";
import { getDict, type Locale } from "@/lib/i18n";

// Barre minimale des écrans Boutique sur mobile : retour à gauche, loupe et sac à droite.
export function ShopTopBar({ locale, backHref }: { locale: Locale; backHref: string }) {
  const t = getDict(locale);
  return (
    <div data-shopnav className="-mx-4 -mt-6 flex items-center justify-between border-b px-2 py-1 md:hidden">
      <Link href={backHref} aria-label={t.f11.back} className="inline-flex min-h-11 min-w-11 items-center justify-center">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </Link>
      <div className="flex items-center">
        <Link href={`/${locale}/catalogue`} aria-label={t.nav.search} className="inline-flex min-h-11 min-w-11 items-center justify-center">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
        </Link>
        <CartLink locale={locale} />
      </div>
    </div>
  );
}
