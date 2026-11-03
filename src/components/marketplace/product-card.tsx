import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import type { ProductView } from "@/lib/catalog";
import { formatEur, getDict, type Locale } from "@/lib/i18n";

export function ProductCard({ product, locale, soldOut }: { product: ProductView; locale: Locale; soldOut?: string }) {
  const t = getDict(locale).product;
  const second = product.images[1];
  return (
    <Card className="group relative h-full overflow-hidden pt-0 transition-shadow focus-within:ring-2 focus-within:ring-ring hover:shadow-md">
      <div className="relative aspect-[4/5] w-full bg-muted">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          unoptimized
          sizes="(min-width: 1024px) 25vw, 50vw"
          className={`object-contain p-3 ${second ? "transition-opacity duration-300 group-hover:opacity-0" : ""}`}
        />
        {second && (
          <Image
            src={second}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-contain p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {product.stock === 1 && <Badge variant="secondary">{t.badgeUnique}</Badge>}
          {product.isNew && <Badge>{t.badgeNew}</Badge>}
        </div>
        <FavoriteButton slug={product.slug} name={product.name} locale={locale} className="absolute right-2 top-2" />
      </div>
      <CardContent className="space-y-1.5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.creatorName}</p>
        <h3 className="font-heading text-base leading-tight md:text-lg">
          <Link href={`/${locale}/produits/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <p className="font-semibold">
          {formatEur(product.priceCents, locale)}
          {soldOut && product.stock === 0 ? <span className="ml-2 text-xs text-destructive">{soldOut}</span> : null}
        </p>
      </CardContent>
    </Card>
  );
}
