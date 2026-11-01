import Image from "next/image";
import Link from "next/link";
import { CreatorCard } from "@/components/marketplace/creator-card";
import { ProductCard } from "@/components/marketplace/product-card";
import { buttonVariants } from "@/components/ui/button";
import { getCategories, getCreators, getFeaturedProducts } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const [products, creators, categories] = await Promise.all([
    getFeaturedProducts(locale, 8),
    getCreators(locale, 4),
    getCategories(locale),
  ]);

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
          href={`/${locale}/produits/${products[0].slug}`}
          className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-muted"
        >
          <Image
            src={products[0].images[0]}
            alt={`${products[0].name} — ${products[0].creatorName}`}
            fill
            unoptimized
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
          <div className="kente-band absolute inset-x-0 bottom-0 h-2" />
        </Link>
      </section>

      <section aria-labelledby="cats" className="space-y-4">
        <h2 id="cats" className="font-heading text-2xl text-primary">
          {t.home.categories}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${locale}/catalogue?category=${c.slug}`}
                className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm hover:border-accent hover:text-terracotta"
              >
                {c.label}
              </Link>
            </li>
          ))}
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
