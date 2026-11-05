"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { getDict, type Locale } from "@/lib/i18n";

export function CartLink({ locale }: { locale: Locale }) {
  const { count, ready } = useCart();
  const t = getDict(locale);
  return (
    <Link
      href={`/${locale}/cart`}
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center px-2 hover:text-terracotta lg:px-0 lg:text-primary lg:hover:text-accent"
      aria-label={`${t.nav.cart} (${ready ? count : 0})`}
      title={t.nav.cart}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="lg:size-6">
        <path d="M5 8h14l1 13H4L5 8z" />
        <path d="M9 8V7a3 3 0 0 1 6 0v1" />
      </svg>
      <span className="absolute right-0 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground lg:h-4 lg:min-w-4 lg:px-0.5">
        {ready ? count : 0}
      </span>
    </Link>
  );
}
