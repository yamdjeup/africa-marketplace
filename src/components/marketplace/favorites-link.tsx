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
      className="inline-flex min-h-11 items-center gap-1 px-2 text-sm hover:text-terracotta"
      aria-label={`${t.title} (${count})`}
    >
      <span aria-hidden="true">♡</span>
      <span className="hidden sm:inline">{t.short}</span>
      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
        {count}
      </span>
    </Link>
  );
}
