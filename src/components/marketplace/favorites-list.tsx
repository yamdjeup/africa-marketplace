"use client";

import Link from "next/link";
import { ProductCard } from "@/components/marketplace/product-card";
import { buttonVariants } from "@/components/ui/button";
import type { ProductView } from "@/lib/catalog";
import { useFavorites } from "@/lib/favorites";
import { getDict, type Locale } from "@/lib/i18n";

export function FavoritesList({ products, locale }: { products: ProductView[]; locale: Locale }) {
  const { slugs } = useFavorites();
  const t = getDict(locale);
  const items = products.filter((p) => slugs.includes(p.slug));

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="font-heading text-xl">{t.favorites.empty}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t.favorites.emptyHint}</p>
        <Link href={`/${locale}/catalogue`} className={buttonVariants({ variant: "outline", className: "mt-4" })}>
          {t.nav.catalog}
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {items.map((p) => (
        <li key={p.slug}>
          <ProductCard product={p} locale={locale} soldOut={t.product.outOfStock} />
        </li>
      ))}
    </ul>
  );
}
