"use client";

import { useFavorites } from "@/lib/favorites";
import { getDict, type Locale } from "@/lib/i18n";

export function FavoriteButton({ slug, name, locale, className = "" }: { slug: string; name: string; locale: Locale; className?: string }) {
  const { has, toggle } = useFavorites();
  const t = getDict(locale).favorites;
  const on = has(slug);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${on ? t.remove : t.add} : ${name}`}
      onClick={() => toggle(slug)}
      className={`z-10 inline-flex size-11 items-center justify-center rounded-full bg-background/90 text-primary shadow-sm hover:text-terracotta focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 20.5S3.500 15.500 3.500 9.500A4.500 4.500 0 0 1 12 7.500a4.500 4.500 0 0 1 8.500 2c0 6-8.500 11-8.500 11z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
