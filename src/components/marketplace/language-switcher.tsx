"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { Locale } from "@/lib/i18n";

function Inner({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const other: Locale = locale === "fr" ? "en" : "fr";
  const rest = pathname.replace(/^\/(fr|en)/, "");
  const href = `/${other}${rest}${search ? `?${search}` : ""}`;
  return (
    <Link
      href={href}
      hrefLang={other}
      lang={other}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 text-sm font-medium uppercase hover:text-terracotta"
      aria-label={other === "en" ? "English" : "Français"}
    >
      {other}
    </Link>
  );
}

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  return (
    <Suspense fallback={<span className="min-w-11" />}>
      <Inner locale={locale} />
    </Suspense>
  );
}
