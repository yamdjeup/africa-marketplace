"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductView } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";
import { formatEur, getDict, type Locale } from "@/lib/i18n";
import { ApproxPrice } from "@/components/marketplace/approx-price";
import { CartLink } from "@/components/marketplace/cart-link";

const DISMISS_KEY = "epomta-notify-dismissed";

// Bloc « Restez informé » : fermeture mémorisée sur l'appareil (aucun envoi réel).
function NotifyBanner({ locale }: { locale: Locale }) {
  const w = getDict(locale).wishlist;
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    // Lecture du stockage local après hydratation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);
  if (hidden) return null;
  return (
    <aside aria-label={w.notifyTitle} className="relative rounded-lg border bg-muted p-4 pr-12">
      <button
        type="button"
        aria-label={w.close}
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setHidden(true);
        }}
        className="absolute right-1 top-1 inline-flex size-11 items-center justify-center text-lg"
      >
        <span aria-hidden="true">✕</span>
      </button>
      <p className="font-heading text-lg text-primary">{w.notifyTitle}</p>
      <p className="mt-1 text-sm text-muted-foreground">{w.notifyText}</p>
      <Link href={`/${locale}/alertes`} className="mt-3 inline-flex min-h-11 items-center rounded-md border border-black px-5 text-sm hover:bg-black hover:text-white">
        {w.notifyCta}
      </Link>
    </aside>
  );
}

export function FavoritesList({ products, locale }: { products: ProductView[]; locale: Locale }) {
  const { slugs, toggle } = useFavorites();
  const { add } = useCart();
  const t = getDict(locale);
  const w = t.wishlist;
  const items = products.filter((p) => slugs.includes(p.slug));

  return (
    <div className="space-y-6">
      <div data-wishlist className="flex items-center justify-between lg:hidden">
        <Link href={`/${locale}`} className="font-heading text-lg font-semibold text-primary">{t.siteName}</Link>
        <div className="flex items-center">
          <Link href={`/${locale}/catalogue`} aria-label={t.nav.search} title={t.nav.search} className="inline-flex size-11 items-center justify-center">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
          </Link>
          <CartLink locale={locale} />
        </div>
      </div>

      <div>
        <h1 className="font-heading text-3xl font-normal text-primary">
          {t.favorites.short} <span className="lg:hidden">({items.length})</span>
        </h1>
        <p className="mt-1 hidden text-sm text-muted-foreground lg:block">{w.count(items.length)}</p>
        <div className="mt-4 border-b">
          <span className="inline-block border-b-2 border-foreground pb-2 text-xs font-medium uppercase tracking-widest">{w.all}</span>
        </div>
      </div>

      <NotifyBanner locale={locale} />

      {items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-heading text-2xl font-normal">{t.favorites.empty}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t.favorites.emptyHint}</p>
          <Link href={`/${locale}/catalogue`} className="mt-6 inline-flex min-h-11 items-center rounded-md border border-black px-6 text-sm hover:bg-black hover:text-white">
            {w.discover}
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
          {items.map((p) => (
            <li key={p.slug} className="space-y-2">
              <div className="relative aspect-[4/5] bg-muted">
                <Link href={`/${locale}/produits/${p.slug}`} className="absolute inset-0">
                  <Image src={p.images[0]} alt={p.name} fill unoptimized sizes="(min-width: 1024px) 25vw, 50vw" className="object-contain p-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => toggle(p.slug)}
                  aria-label={`${t.favorites.remove} : ${p.name}`}
                  className="absolute right-1 top-1 z-10 inline-flex size-11 items-center justify-center text-xl leading-none hover:text-terracotta focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide lg:text-sm">{p.creatorName}</p>
              <p className="text-sm text-muted-foreground">{p.name}</p>
              <p className="text-sm font-semibold">
                {formatEur(p.priceCents, locale)}
                <ApproxPrice cents={p.priceCents} locale={locale} />
              </p>
              {p.stock === 0 ? (
                <p className="text-xs text-destructive">{t.product.outOfStock}</p>
              ) : p.sizes.length > 0 ? (
                <Link href={`/${locale}/produits/${p.slug}`} className="inline-flex min-h-9 items-center text-xs underline underline-offset-4">
                  {w.chooseSize}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => add({ slug: p.slug, size: null, name: p.name, creatorName: p.creatorName, image: p.images[0], priceCents: p.priceCents, maxQuantity: p.stock })}
                  className="inline-flex min-h-9 items-center text-xs underline underline-offset-4 hover:text-terracotta"
                >
                  {t.product.addToCart}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
