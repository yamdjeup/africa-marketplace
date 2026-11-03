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
  sizes?: string[];
  sizeLabel?: string;
};

export function AddToCart({ locale, slug, name, creatorName, image, priceCents, stock, sizes = [], sizeLabel }: Props) {
  const t = getDict(locale).product;
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const disabled = stock === 0 || added;

  return (
    <div className="space-y-4">
      {sizes.length > 0 && stock > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{sizeLabel ?? t.size}</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <label
                key={s}
                className={`flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border px-3 text-sm has-[:focus-visible]:ring-2 ${
                  size === s ? "border-primary bg-primary text-primary-foreground" : "bg-background"
                }`}
              >
                <input
                  type="radio"
                  name={`size-${slug}`}
                  value={s}
                  checked={size === s}
                  onChange={() => {
                    setSize(s);
                    setMissing(false);
                  }}
                  className="sr-only"
                />
                {s}
              </label>
            ))}
          </div>
          {missing && (
            <p role="alert" className="text-sm text-destructive">
              {t.sizeRequired}
            </p>
          )}
        </fieldset>
      )}
      <Button
        size="lg"
        className="h-12 w-full"
        disabled={disabled}
        onClick={() => {
          if (sizes.length > 0 && !size) {
            setMissing(true);
            return;
          }
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
