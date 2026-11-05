"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getDict, type Locale } from "@/lib/i18n";

export function AccountMenu({ locale, name }: { locale: Locale; name: string | null }) {
  const t = getDict(locale);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const base = `/${locale}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const link = "flex min-h-11 items-center text-sm hover:text-terracotta";
  return (
    <div ref={box} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={t.account.accountIcon}
        title={t.account.accountIcon}
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-terracotta"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
      </button>
      {open && (
        <div id="account-menu" role="dialog" aria-label={t.account.myAccount} className="absolute right-0 top-full z-30 w-72 border bg-background p-5 shadow-lg">
          <button type="button" onClick={() => setOpen(false)} aria-label={t.f9.close} className="absolute right-2 top-2 inline-flex size-9 items-center justify-center text-lg">
            ✕
          </button>
          {name ? (
            <>
              <p className="mb-3 pr-8 font-heading text-xl font-normal text-primary">{name}</p>
              <nav aria-label={t.account.myAccount}>
                <Link href={`${base}/account/orders`} className={link}>{t.account.orders.title}</Link>
                <Link href={`${base}/account/security`} className={link}>{t.me.security}</Link>
                <Link href={`${base}/account/addresses`} className={link}>{t.me.addresses}</Link>
                <Link href={`${base}/alertes`} className={link}>{t.f9.prefs}</Link>
              </nav>
              <Link href={`${base}/account`} className="mt-3 flex h-11 items-center justify-center bg-black text-sm text-white hover:bg-black/85">
                {t.account.myAccount}
              </Link>
            </>
          ) : (
            <>
              <p className="mb-3 pr-8 font-heading text-xl font-normal text-primary">{t.f9.signInOrCreate}</p>
              <Link href={`${base}/login`} className="flex h-11 items-center justify-center bg-black text-sm text-white hover:bg-black/85">
                {t.account.login}
              </Link>
              <Link href={`${base}/register`} className="mt-2 flex h-11 items-center justify-center border border-black text-sm hover:bg-black hover:text-white">
                {t.account.register}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
