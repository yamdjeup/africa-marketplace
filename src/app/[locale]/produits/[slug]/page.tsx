import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/marketplace/add-to-cart";
import { ProductCard } from "@/components/marketplace/product-card";
import { ProductGallery } from "@/components/marketplace/product-gallery";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/marketplace/breadcrumb";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { ruleFor } from "@/lib/category-rules";
import { getCreatorWithProducts, getProduct } from "@/lib/catalog";
import { formatEur, getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getProduct(slug, locale);
  if (!data) return { title: getDict(locale).product.notFound };
  return { title: data.product.name, description: data.product.description };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  const data = await getProduct(slug, locale);
  if (!data) notFound();
  const { product: p, creator, categoryLabel } = data;
  const t = getDict(locale).product;
  const rule = ruleFor(p.categorySlug);
  const sizeKind = rule.sizeKind;
  const cm = [p.widthCm, p.heightCm, p.depthCm].filter((v): v is number => v != null).join(" × ");
  const cmLabel = cm ? `${cm} ${t.cmUnit}` : "";
  const catalogT = getDict(locale).catalog;
  const more = (await getCreatorWithProducts(creator.slug, locale))?.products.filter((x) => x.slug !== p.slug).slice(0, 4) ?? [];

  return (
    <div className="space-y-12">
      <Breadcrumb
        label={catalogT.breadcrumb}
        items={[
          { label: catalogT.home, href: `/${locale}` },
          { label: catalogT.title, href: `/${locale}/catalogue` },
          { label: categoryLabel, href: `/${locale}/catalogue?category=${p.categorySlug}` },
          { label: p.name },
        ]}
      />
      <div className="grid gap-6 md:grid-cols-[3fr_2fr] md:gap-10">
        <ProductGallery images={p.images} name={p.name} label={t.gallery} />
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary">{categoryLabel}</Badge>
              <FavoriteButton slug={p.slug} name={p.name} locale={locale} className="relative border" />
            </div>
            <h1 className="font-heading text-3xl leading-tight text-primary">{p.name}</h1>
            <p className="text-sm text-muted-foreground">
              {t.by}{" "}
              <Link href={`/${locale}/createurs/${creator.slug}`} className="underline underline-offset-4">
                {creator.name}
              </Link>
            </p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{formatEur(p.priceCents, locale)}</p>
            <p className="text-xs text-muted-foreground">{t.fictitiousPrice}</p>
          </div>
          <p>{p.description}</p>
          <p className={`text-sm ${p.stock === 0 ? "text-destructive" : "text-kente"}`}>
            {p.stock === 0 ? t.outOfStock : t.inStock()}
          </p>
          <AddToCart
            key={p.slug}
            locale={locale}
            slug={p.slug}
            name={p.name}
            creatorName={p.creatorName}
            image={p.images[0]}
            priceCents={p.priceCents}
            stock={p.stock}
            sizes={sizeKind ? p.sizes : []}
            sizeLabel={sizeKind === "ring" ? t.sizeRing : t.size}
          />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t pt-4 text-sm">
            {p.material && (
              <>
                <dt className="font-medium">{t.material}</dt>
                <dd>{p.material}</dd>
              </>
            )}
            {p.technique && (
              <>
                <dt className="font-medium">{t.technique}</dt>
                <dd>{p.technique}</dd>
              </>
            )}
            {!p.material && !p.technique && (
              <>
                <dt className="font-medium">{t.materials}</dt>
                <dd>{p.materials.join(", ")}</dd>
              </>
            )}
            {p.origin && (
              <>
                <dt className="font-medium">{t.origin}</dt>
                <dd>{p.origin}</dd>
              </>
            )}
            {rule.dimensions && cm && (
              <>
                <dt className="font-medium">{t.dimensions}</dt>
                <dd>{cmLabel}</dd>
              </>
            )}
            {rule.dimensions && !cm && p.dimensions && (
              <>
                <dt className="font-medium">{t.dimensions}</dt>
                <dd>{p.dimensions}</dd>
              </>
            )}
          </dl>
          {p.hasCertificate && (
            <p className="flex items-center gap-2 rounded-md border border-secondary/60 bg-secondary/10 px-3 py-2 text-sm">
              <span aria-hidden="true">✓</span>
              {t.certificate}
            </p>
          )}
          {rule.care && p.careInstructions && (
            <section aria-labelledby="care" className="space-y-1 text-sm">
              <h2 id="care" className="font-medium">
                {t.care}
              </h2>
              <p className="text-muted-foreground">{p.careInstructions}</p>
            </section>
          )}
        </div>
      </div>

      <section aria-labelledby="story" className="max-w-prose space-y-2">
        <h2 id="story" className="font-heading text-2xl text-primary">
          {t.story}
        </h2>
        <p className="text-muted-foreground">{p.story}</p>
      </section>

      {more.length > 0 && (
        <section aria-labelledby="more" className="space-y-4">
          <h2 id="more" className="font-heading text-2xl text-primary">
            {t.more}
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {more.map((m) => (
              <li key={m.slug}>
                <ProductCard product={m} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
