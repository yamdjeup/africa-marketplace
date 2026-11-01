"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { getDict, type Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  slug: string;
  name: string;
  creatorName: string;
  image: string;
  priceCents: number;
  stock: number;
};

export function AddToCart({ locale, slug, name, creatorName, image, priceCents, stock }: Props) {
  const t = getDict(locale).product;
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const disabled = stock === 0 || added;

  return (
    <div className="space-y-4">
      <Button
        size="lg"
        className="h-12 w-full"
        disabled={disabled}
        onClick={() => {
          add({ slug, size: null, name, creatorName, image, priceCents, maxQuantity: stock });
          setAdded(true);
        }}
      >
        {stock === 0 ? t.outOfStock : t.addToCart}
      </Button>
      <div role="status" aria-live="polite" className="min-h-6 text-sm">
        {added && (
          <span className="text-kente">
            {t.added} —{" "}
            <Link href={`/${locale}/cart`} className={buttonVariants({ variant: "link", className: "h-auto p-0" })}>
              {t.viewCart}
            </Link>
          </span>
        )}
      </div>
    </div>
  );
}
