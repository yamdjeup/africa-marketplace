import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/marketplace/add-to-cart";
import { ProductCard } from "@/components/marketplace/product-card";
import { ProductGallery } from "@/components/marketplace/product-gallery";
import { RecentTracker } from "@/components/marketplace/recent-views";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/marketplace/breadcrumb";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { ShareButton } from "@/components/marketplace/share-button";
import { RoomPreview } from "@/components/marketplace/room-preview";
import { MirrorTryOn } from "@/components/marketplace/mirror-try-on";
import { MIRROR_CATEGORIES, MIRROR_ITEMS } from "@/data/mirror-items";

const ROOM_CATEGORIES = ["peinture", "sculpture", "photographie", "textile-decoration"];
import { ruleFor } from "@/lib/category-rules";
import { getProduct, getRelatedProducts } from "@/lib/catalog";
import { formatEur, getDict, type Locale } from "@/lib/i18n";
import { ApproxPrice } from "@/components/marketplace/approx-price";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getProduct(slug, locale);
  if (!data) return { title: getDict(locale).product.notFound };
  return { title: data.product.name, description: data.product.description };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  const [data, more] = await Promise.all([getProduct(slug, locale), getRelatedProducts(slug, locale, 4)]);
  if (!data) notFound();
  const { product: p, creator, categoryLabel } = data;
  const t = getDict(locale).product;
  const rule = ruleFor(p.categorySlug);
  const sizeKind = rule.sizeKind;
  const cm = [p.widthCm, p.heightCm, p.depthCm].filter((v): v is number => v != null).join(" × ");
  const cmLabel = cm ? `${cm} ${t.cmUnit}` : "";
  const catalogT = getDict(locale).catalog;
  const mirror = MIRROR_CATEGORIES.includes(p.categorySlug) && p.images.length > 0 ? MIRROR_ITEMS[p.slug] : undefined;
  const roomOk =
    ROOM_CATEGORIES.includes(p.categorySlug) && !!p.widthCm && !!p.heightCm && p.widthCm > 0 && p.heightCm > 0 && p.images.length > 0;

  return (
    <div className="space-y-12">
      <RecentTracker item={{ slug: p.slug, name: p.name, creatorName: p.creatorName, image: p.images[0] ?? "", priceCents: p.priceCents }} />
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
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{categoryLabel}</Badge>
                {p.isExample && <Badge variant="outline">{t.example}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <ShareButton title={p.name} text={`${p.name} — ${creator.name}`} label={locale === "fr" ? "Partager cette œuvre" : "Share this artwork"} />
                <FavoriteButton slug={p.slug} name={p.name} locale={locale} className="relative border" />
              </div>
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
            <p className="text-2xl font-semibold">
              {formatEur(p.priceCents, locale)}
              <ApproxPrice cents={p.priceCents} locale={locale} />
            </p>
            {!p.isPartner && <p className="text-xs text-muted-foreground">{t.fictitiousPrice}</p>}
          </div>
          <p>{p.description}</p>
          <p className={`text-sm ${p.stock === 0 ? "text-destructive" : "text-kente"}`}>
            {p.stock === 0 ? t.outOfStock : t.inStock(p.stock)}
            {p.edition && !(p.stock > 0 && p.stock <= 1 && /pi[eè]ce unique|unique piece/i.test(p.edition)) ? ` · ${locale === "fr" ? "Édition" : "Edition"} ${p.edition}` : ""}
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
            sizes={p.variants.length > 0 ? p.variants.map((v) => v.label) : sizeKind ? p.sizes : []}
            sizeStock={p.variants.length > 0 ? Object.fromEntries(p.variants.map((v) => [v.label, v.available])) : undefined}
            sizeLabel={p.variants.length > 0 ? (locale === "fr" ? "Taille / couleur" : "Size / colour") : sizeKind === "ring" ? t.sizeRing : t.size}
          />
          {roomOk && (
            <RoomPreview
              key={p.slug}
              locale={locale}
              image={p.images[0]}
              name={p.name}
              widthCm={p.widthCm!}
              heightCm={p.heightCm!}
              flat={p.categorySlug !== "sculpture"}
            />
          )}
          {mirror && <MirrorTryOn key={`mirror-${p.slug}`} locale={locale} image={p.images[0]} name={p.name} kind={mirror.kind} />}
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
                <dd>
                  {cmLabel}{!p.isPartner && <span className="text-xs text-muted-foreground"> ({t.fictitiousDimensions})</span>}
                </dd>
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

      {p.story.trim() && (
        <section aria-labelledby="story" className="max-w-prose space-y-2">
          <h2 id="story" className="font-heading text-2xl text-primary">
            {t.story}
          </h2>
          <p className="text-muted-foreground">{p.story}</p>
        </section>
      )}

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
