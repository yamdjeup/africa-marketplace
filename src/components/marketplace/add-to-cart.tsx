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
  sizes: string[];
  stock: number;
};

export function AddToCart({ locale, slug, name, creatorName, image, priceCents, sizes, stock }: Props) {
  const t = getDict(locale).product;
  const { add } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const needsSize = sizes.length > 0;
  const disabled = stock === 0 || (needsSize && !size);

  return (
    <div className="space-y-4">
      {needsSize && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t.size}</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <label
                key={s}
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  type="radio"
                  name="size"
                  value={s}
                  checked={size === s}
                  onChange={() => {
                    setSize(s);
                    setAdded(false);
                  }}
                  className="sr-only"
                />
                {s}
              </label>
            ))}
          </div>
          {!size && <p className="text-xs text-muted-foreground">{t.chooseSize}</p>}
        </fieldset>
      )}
      <Button
        size="lg"
        className="h-12 w-full"
        disabled={disabled}
        onClick={() => {
          add({ slug, size, name, creatorName, image, priceCents, maxQuantity: stock });
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
