"use client";

import Link from "next/link";
import { useFavorites } from "@/lib/favorites";
import { getDict, type Locale } from "@/lib/i18n";

export function FavoritesLink({ locale }: { locale: Locale }) {
  const { count } = useFavorites();
  const t = getDict(locale).favorites;
  return (
    <Link
      href={`/${locale}/favoris`}
      className="relative inline-flex min-h-11 items-center gap-1 px-2 text-sm hover:text-terracotta lg:min-w-11 lg:justify-center lg:px-0 lg:text-primary lg:hover:text-accent"
      aria-label={`${t.title} (${count})`}
    >
      <span aria-hidden="true" className="lg:hidden">♡</span>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="hidden lg:block">
        <path d="M12 20.5S3.5 15 3.5 9A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.5 2c0 6-8.5 11.5-8.5 11.5z" />
      </svg>
      <span className="hidden text-xs sm:inline lg:hidden">{t.short}</span>
      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground lg:absolute lg:right-0 lg:top-1.5 lg:h-4 lg:min-w-4 lg:px-0.5 lg:text-[10px] lg:leading-4">
        {count}
      </span>
    </Link>
  );
}
