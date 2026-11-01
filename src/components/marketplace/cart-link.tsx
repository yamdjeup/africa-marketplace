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
      className="relative inline-flex min-h-11 items-center gap-1 px-2 text-sm hover:text-terracotta"
      aria-label={`${t.nav.cart} (${ready ? count : 0})`}
    >
      {t.nav.cart}
      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
        {ready ? count : 0}
      </span>
    </Link>
  );
}
