import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { ProductView } from "@/lib/catalog";
import { formatEur, type Locale } from "@/lib/i18n";

export function ProductCard({ product, locale, soldOut }: { product: ProductView; locale: Locale; soldOut?: string }) {
  return (
    <Card className="relative h-full overflow-hidden pt-0 transition-shadow focus-within:ring-2 focus-within:ring-ring hover:shadow-md">
      <div className="relative aspect-[4/5] w-full bg-muted">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          unoptimized
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover"
        />
      </div>
      <CardContent className="space-y-1.5">
        <h3 className="font-heading text-base leading-tight md:text-lg">
          <Link href={`/${locale}/produits/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground">{product.creatorName}</p>
        <p className="font-semibold">
          {formatEur(product.priceCents, locale)}
          {soldOut && product.stock === 0 ? <span className="ml-2 text-xs text-destructive">{soldOut}</span> : null}
        </p>
      </CardContent>
    </Card>
  );
}
