import Link from "next/link";
import { auth } from "@/auth";
import { AccountMenu } from "@/components/marketplace/account-menu";
import { CartLink } from "@/components/marketplace/cart-link";
import { FavoritesLink } from "@/components/marketplace/favorites-link";
import { RegionPanel } from "@/components/marketplace/region-panel";
import { SearchBox } from "@/components/marketplace/search-box";
import { getCategoryMenu } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const session = await auth();
  const menu = await getCategoryMenu(locale);
  const labels = { artist: t.catalog.kindArtist, category: t.catalog.kindCategory, work: t.catalog.kindWork };
  return (
    <header className="z-10 border-b bg-background/95 backdrop-blur md:sticky md:top-0 max-lg:[body:has([data-wishlist])_&]:hidden max-md:[body:has([data-account])_&]:hidden max-md:[body:has([data-shopnav])_&]:hidden">
      <div className="kente-band h-1" />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 lg:grid lg:max-w-[1400px] lg:grid-cols-[1fr_auto_1fr] lg:gap-x-8 lg:py-3">
        <Link href={`/${locale}`} className="font-heading text-lg font-semibold text-primary md:text-xl lg:order-2 lg:text-center lg:text-3xl">
          {t.siteName}
        </Link>
        <nav aria-label={t.nav.main} className="order-3 flex w-full items-center gap-4 text-sm md:order-none md:w-auto md:gap-6 lg:order-1">
          <Link href={`/${locale}/catalogue`} className="hidden min-h-11 items-center hover:text-terracotta md:inline-flex">
            {t.nav.catalog}
          </Link>
          <Link href={`/${locale}/partenaires`} className="hidden min-h-11 items-center hover:text-terracotta md:inline-flex">
            {t.nav.creators}
          </Link>
          <form action={`/${locale}/catalogue`} role="search" className="relative flex w-full md:w-auto lg:hidden">
            <label htmlFor="header-search" className="sr-only">
              {t.nav.search}
            </label>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground md:hidden">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
            <SearchBox
              id="header-search"
              locale={locale}
              placeholder={t.f4.searchPlaceholder}
              labels={labels}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm max-md:rounded-lg max-md:border-0 max-md:bg-muted max-md:pl-10 md:w-52"
            />
          </form>
        </nav>
        <div className="flex items-center lg:order-3 lg:justify-self-end lg:gap-5">
          {session?.user && (
            <Link href={`/${locale}/account/orders`} className="inline-flex min-h-11 items-center px-2 text-sm hover:text-terracotta max-md:hidden lg:hidden">
              {t.account.orders.title}
            </Link>
          )}
          <Link
            href={`/${locale}/${session?.user ? "account" : "login"}`}
            aria-label={t.account.accountIcon}
            title={t.account.accountIcon}
            className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-terracotta max-md:hidden lg:hidden"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
            </svg>
          </Link>
          <div className="hidden lg:order-3 lg:block"><AccountMenu locale={locale} name={session?.user?.name ?? null} /></div>
          {session?.user?.name && (
            <span className="hidden max-w-[10ch] truncate text-xs font-light text-muted-foreground lg:order-4 lg:-ml-3 lg:inline">{session.user.name.split(" ")[0]}</span>
          )}
          <div className="max-md:hidden md:contents lg:order-1 lg:flex"><RegionPanel locale={locale} /></div>
          <span aria-hidden="true" className="hidden h-6 w-px bg-foreground/20 lg:order-2 lg:block" />
          <div className="max-md:hidden md:contents lg:order-5 lg:flex"><FavoritesLink locale={locale} /></div>
          <div className="contents lg:order-6 lg:flex"><CartLink locale={locale} /></div>
        </div>
      </div>
      <div className="border-t lg:mx-auto lg:flex lg:max-w-[1400px] lg:items-center lg:justify-between lg:gap-8 lg:px-4">
      <nav aria-label={t.catalog.title} className="min-w-0">
        <ul className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-4 text-sm lg:mx-0 lg:max-w-none lg:gap-5 xl:gap-8 lg:overflow-visible lg:px-0 lg:font-light">
          {menu.map((c) => (
            <li key={c.slug} className="group relative shrink-0">
              <Link href={`/${locale}/catalogue?category=${c.slug}`} className="inline-flex min-h-11 items-center hover:text-terracotta">
                {c.label}
              </Link>
              <div className="invisible absolute left-1/2 top-full z-20 hidden w-[28rem] -translate-x-1/2 gap-6 border bg-background p-5 text-sm opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 lg:grid lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{t.nav.creators}</p>
                  <ul className="space-y-1">
                    {c.artists.map((a) => (
                      <li key={a.slug}>
                        <Link href={`/${locale}/catalogue?category=${c.slug}&artist=${a.slug}`} className="hover:underline">{a.name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{t.f4.menuCountries}</p>
                  <ul className="space-y-1">
                    {c.countries.map((k) => (
                      <li key={k.value}>
                        <Link href={`/${locale}/catalogue?category=${c.slug}&country=${k.value}`} className="hover:underline">{k.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href={`/${locale}/catalogue?category=${c.slug}`} className="col-span-2 border-t pt-3 font-medium underline underline-offset-4">
                  {t.f4.seeAll} — {c.label}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </nav>
      <form action={`/${locale}/catalogue`} role="search" className="relative hidden lg:flex">
        <label htmlFor="header-search-lg" className="sr-only">
          {t.nav.search}
        </label>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
        <SearchBox
          id="header-search-lg"
          locale={locale}
          placeholder={t.f4.searchPlaceholder}
          labels={labels}
          className="h-11 w-44 border-0 xl:w-72 border-b border-foreground/40 bg-transparent pl-7 text-sm font-light focus:border-foreground focus:outline-none"
        />
      </form>
      </div>
    </header>
  );
}
