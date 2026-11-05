"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDict, type Locale } from "@/lib/i18n";

const icons = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  shop: (
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </>
  ),
  favorites: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  me: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </>
  ),
};

export function MobileTabBar({ locale, loggedIn }: { locale: Locale; loggedIn: boolean }) {
  const t = getDict(locale).f4.tabs;
  const path = usePathname();
  const base = `/${locale}`;
  const items = [
    { key: "home", href: base, label: t.home, active: path === base },
    { key: "shop", href: `${base}/boutique`, label: t.shop, active: path.startsWith(`${base}/boutique`) || path.startsWith(`${base}/createurs`) || path.startsWith(`${base}/catalogue`) || path.startsWith(`${base}/produits`) },
    { key: "favorites", href: `${base}/favoris`, label: t.favorites, active: path.startsWith(`${base}/favoris`) },
    { key: "me", href: `${base}/${loggedIn ? "account" : "login"}`, label: t.me, active: path.startsWith(`${base}/account`) || path.startsWith(`${base}/login`) || path.startsWith(`${base}/register`) },
  ] as const;
  return (
    <nav aria-label={t.label} className="fixed inset-x-0 bottom-0 z-20 border-t bg-background md:hidden">
      <ul className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {items.map((i) => (
          <li key={i.key}>
            <Link
              href={i.href}
              aria-current={i.active ? "page" : undefined}
              className="mx-1 my-1 flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] aria-[current=page]:bg-muted aria-[current=page]:font-semibold"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {icons[i.key]}
              </svg>
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
