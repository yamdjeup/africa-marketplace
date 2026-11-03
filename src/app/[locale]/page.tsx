import Image from "next/image";
import Link from "next/link";
import { CreatorCard } from "@/components/marketplace/creator-card";
import { ProductCard } from "@/components/marketplace/product-card";
import { buttonVariants } from "@/components/ui/button";
import { CREATOR_VIDEO_SHOWCASE } from "@/data/creator-videos";
import { getCategoryShowcase, getCreators, getFeaturedProducts, getHeroProduct } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const [products, creators, categories, allCreators, hero] = await Promise.all([
    getFeaturedProducts(locale, 8),
    getCreators(locale, 4),
    getCategoryShowcase(locale),
    getCreators(locale),
    getHeroProduct(locale),
  ]);
  const heroProduct = hero ?? products[0];
  const videoArtists = CREATOR_VIDEO_SHOWCASE.flatMap((v) => {
    const c = allCreators.find((x) => x.slug === v.slug);
    return c ? [{ ...v, name: c.name }] : [];
  });

  return (
    <div className="space-y-12 md:space-y-16">
      <section className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-widest text-terracotta">{t.home.heroKicker}</p>
          <h1 className="font-heading text-3xl leading-tight text-primary md:text-5xl">{t.home.heroTitle}</h1>
          <p className="max-w-prose text-muted-foreground">{t.home.heroText}</p>
          <Link href={`/${locale}/catalogue`} className={buttonVariants({ size: "lg" })}>
            {t.home.heroCta}
          </Link>
        </div>
        <Link
          href={`/${locale}/produits/${heroProduct.slug}`}
          className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-muted"
        >
          <Image
            src={heroProduct.images[0]}
            alt={`${heroProduct.name} — ${heroProduct.creatorName}`}
            fill
            unoptimized
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-contain p-4 pb-6"
          />
          <div className="kente-band absolute inset-x-0 bottom-0 h-2" />
        </Link>
      </section>

      <section aria-labelledby="cats" className="space-y-4">
        <h2 id="cats" className="font-heading text-2xl text-primary">
          {t.home.categories}
        </h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {categories.map((c) => {
            const body = (
              <>
                {c.image && (
                  <Image
                    src={c.image}
                    alt={c.imageAlt}
                    fill
                    unoptimized
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                  <p className="font-heading text-lg leading-tight">{c.label}</p>
                  <p className="text-xs opacity-90">{c.count > 0 ? t.home.worksCount(c.count) : t.home.soon}</p>
                </div>
              </>
            );
            const base = "relative block aspect-[4/3] overflow-hidden rounded-lg bg-muted";
            return (
              <li key={c.slug}>
                {c.count > 0 ? (
                  <Link href={`/${locale}/catalogue?category=${c.slug}`} className={`group ${base}`}>
                    {body}
                  </Link>
                ) : (
                  <div className={`${base} bg-secondary`} aria-label={`${c.label} — ${t.home.soon}`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                      <p className="font-heading text-lg leading-tight">{c.label}</p>
                      <p className="text-xs opacity-90">{t.home.soon}</p>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="sel" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 id="sel" className="font-heading text-2xl text-primary">
            {t.home.selection}
          </h2>
          <Link href={`/${locale}/catalogue`} className="text-sm underline underline-offset-4">
            {t.home.allProducts}
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {products.map((p) => (
            <li key={p.slug}>
              <ProductCard product={p} locale={locale} />
            </li>
          ))}
        </ul>
      </section>

      {videoArtists.length > 0 && (
        <section aria-labelledby="vid" className="space-y-4">
          <div>
            <h2 id="vid" className="font-heading text-2xl text-primary">
              {t.home.videosTitle}
            </h2>
            <p className="text-sm text-muted-foreground">{t.home.videosIntro}</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {videoArtists.map((v) => (
              <li key={v.slug}>
                <Link
                  href={`/${locale}/createurs/${v.slug}`}
                  className="group block overflow-hidden rounded-lg border border-accent/60 bg-card"
                >
                  <span className="relative block aspect-video bg-muted">
                    <Image
                      src={v.poster}
                      alt={v.name}
                      fill
                      unoptimized
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className="object-cover"
                    />
                    <span
                      aria-hidden
                      className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      ▶
                    </span>
                  </span>
                  <span className="block p-3">
                    <span className="block font-heading text-lg text-primary">{v.name}</span>
                    <span className="text-sm text-terracotta group-hover:underline">{t.home.watch}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="cre" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 id="cre" className="font-heading text-2xl text-primary">
            {t.home.featuredCreators}
          </h2>
          <Link href={`/${locale}/createurs`} className="text-sm underline underline-offset-4">
            {t.home.allCreators}
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {creators.map((c) => (
            <li key={c.slug}>
              <CreatorCard creator={c} locale={locale} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="about" className="max-w-prose space-y-2 border-t pt-8">
        <h2 id="about" className="font-heading text-2xl text-primary">
        {t.home.aboutTitle}
        </h2>
        <p className="text-muted-foreground">{t.home.aboutText}</p>
      </section>
    </div>
  );
}
