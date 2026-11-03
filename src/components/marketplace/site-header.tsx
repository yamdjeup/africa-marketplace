import Link from "next/link";
import { auth } from "@/auth";
import { CartLink } from "@/components/marketplace/cart-link";
import { LanguageSwitcher } from "@/components/marketplace/language-switcher";
import { getCategories } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const session = await auth();
  const categories = await getCategories(locale);
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="bg-accent/20 py-1 text-center text-xs tracking-wide text-foreground">{t.demoBanner}</div>
      <div className="kente-band h-1" />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <Link href={`/${locale}`} className="font-heading text-lg font-semibold text-primary md:text-xl">
          {t.siteName}
          <span className="block text-[10px] font-normal leading-none text-muted-foreground">{t.brandMeaning}</span>
        </Link>
        <nav aria-label={t.nav.main} className="order-3 flex w-full items-center gap-4 text-sm md:order-none md:w-auto md:gap-6">
          <Link href={`/${locale}/catalogue`} className="inline-flex min-h-11 items-center hover:text-terracotta">
            {t.nav.catalog}
          </Link>
          <Link href={`/${locale}/createurs`} className="inline-flex min-h-11 items-center hover:text-terracotta">
            {t.nav.creators}
          </Link>
          <form action={`/${locale}/catalogue`} role="search" className="ml-auto flex md:ml-0">
            <label htmlFor="header-search" className="sr-only">
              {t.nav.search}
            </label>
            <input
              id="header-search"
              name="q"
              type="search"
              placeholder={t.nav.search}
              className="h-11 w-32 rounded-md border bg-background px-3 text-sm sm:w-44"
            />
          </form>
        </nav>
        <div className="flex items-center">
          {session?.user ? (
            <>
              <Link href={`/${locale}/account/orders`} className="inline-flex min-h-11 items-center px-2 text-sm hover:text-terracotta">
                {t.account.orders.title}
              </Link>
              <Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center px-2 text-sm hover:text-terracotta">
                {t.account.myAccount}
              </Link>
            </>
          ) : (
            <Link href={`/${locale}/login`} className="inline-flex min-h-11 items-center px-2 text-sm hover:text-terracotta">
              {t.account.login}
            </Link>
          )}
          <LanguageSwitcher locale={locale} />
          <CartLink locale={locale} />
        </div>
      </div>
      <nav aria-label={t.catalog.title} className="border-t">
        <ul className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-4 text-sm">
          {categories.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link href={`/${locale}/catalogue?category=${c.slug}`} className="inline-flex min-h-11 items-center hover:text-terracotta">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
