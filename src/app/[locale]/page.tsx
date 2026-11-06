import Image from "next/image";
import Link from "next/link";
import { CreatorAvatar } from "@/components/marketplace/creator-avatar";
import { Newsletter } from "@/components/marketplace/newsletter";
import { ScrollRow } from "@/components/marketplace/scroll-row";
import { ProductCard } from "@/components/marketplace/product-card";
import { buttonVariants } from "@/components/ui/button";
import { CREATOR_VIDEO_SHOWCASE } from "@/data/creator-videos";
import { getCategoryShowcase, getCreators, getFeaturedProducts, getHeroProduct } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

function Carousel({ id, title, sub, href, seeAll, hint, prev, next, children }: { id: string; title: string; sub: string; href: string; seeAll: string; hint: string; prev: string; next: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id={id} className="font-heading text-2xl text-primary">{title}</h2>
          <p className="text-sm text-muted-foreground">{sub}</p>
        </div>
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-black px-4 text-sm hover:bg-black hover:text-white">
          {seeAll}
        </Link>
      </div>
      <ScrollRow label={`${title}. ${hint}`} prev={prev} next={next}>
        {children}
      </ScrollRow>
    </section>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const f = t.f4;
  const [products, categories, allCreators, hero] = await Promise.all([
    getFeaturedProducts(locale, 16),
    getCategoryShowcase(locale),
    getCreators(locale),
    getHeroProduct(locale),
  ]);
  const heroProduct = hero ?? products[0];
  const newIn = products.slice(0, 8);
  const trending = products.length > 8 ? products.slice(8) : products;
  const banners = ["couture-mode", "peinture"].flatMap((s) => categories.filter((c) => c.slug === s && c.count > 0 && c.image));
  const videoArtists = CREATOR_VIDEO_SHOWCASE.flatMap((v) => {
    const c = allCreators.find((x) => x.slug === v.slug);
    return c ? [{ ...v, name: c.name }] : [];
  });

  const banner = (i: number) => {
    const c = banners[i];
    if (!c) return null;
    return (
      <section aria-label={c.label} className={`grid items-center gap-6 md:grid-cols-2 md:gap-10 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
        <Link href={`/${locale}/catalogue?category=${c.slug}`} className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-muted" tabIndex={-1} aria-hidden>
          <Image src={c.image!} alt="" fill unoptimized sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </Link>
        <div className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-widest text-terracotta">{f.bannerKicker}</p>
          <h2 className="font-heading text-3xl font-normal text-primary md:text-4xl">{c.label}</h2>
          <p className="mx-auto max-w-prose text-muted-foreground">{f.bannerText(c.label.toLowerCase())}</p>
          <Link href={`/${locale}/catalogue?category=${c.slug}`} className="inline-flex min-h-11 items-center rounded-md border border-black px-6 text-sm hover:bg-black hover:text-white">
            {f.discover}
          </Link>
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-12 md:space-y-16">
      <p className="-mx-4 -mt-6 bg-primary px-4 py-3 text-center text-sm text-primary-foreground md:hidden">{f.promoBar}</p>
      <section className="grid items-center gap-6 md:grid-cols-2 md:gap-10 lg:gap-0 lg:overflow-hidden lg:bg-muted">
        <div className="space-y-4 max-md:text-center lg:space-y-6 lg:px-12 lg:text-center">
          <p className="text-xs uppercase tracking-widest text-terracotta">{t.home.heroKicker}</p>
          <h1 className="font-heading text-3xl leading-tight text-primary max-md:font-normal md:text-5xl lg:font-normal">{t.home.heroTitle}</h1>
          <p className="max-w-prose text-muted-foreground max-md:mx-auto lg:mx-auto lg:font-heading lg:text-lg lg:italic">{t.home.heroText}</p>
          <Link href={`/${locale}/catalogue`} className={`${buttonVariants({ size: "lg" })} max-md:border max-md:border-black max-md:bg-transparent max-md:text-black lg:border lg:border-black lg:bg-transparent lg:text-black lg:hover:bg-black lg:hover:text-white`}>
            <span className="md:hidden">{f.discover}</span>
            <span className="max-md:hidden">{t.home.heroCta}</span>
          </Link>
        </div>
        <Link
          href={`/${locale}/produits/${heroProduct.slug}`}
          className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-muted max-md:-mx-4 max-md:order-first max-md:aspect-[4/5] max-md:rounded-none lg:aspect-auto lg:h-[34rem] lg:rounded-none"
        >
          <Image
            src={heroProduct.images[0]}
            alt={`${heroProduct.name} — ${heroProduct.creatorName}`}
            fill
            unoptimized
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-contain p-4 pb-6 lg:object-cover lg:p-0"
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

      <Carousel id="new" title={f.newIn} sub={f.newInSub} href={`/${locale}/catalogue`}       seeAll={f.seeAll} hint={f.carousel} prev={f.prev} next={f.next}>
        {newIn.map((p) => (
          <li key={p.slug} className="w-44 shrink-0 snap-start md:w-56">
            <ProductCard product={p} locale={locale} />
          </li>
        ))}
      </Carousel>

      {banner(0)}

      <Carousel id="sel" title={f.trending} sub={f.trendingSub} href={`/${locale}/catalogue`}       seeAll={f.seeAll} hint={f.carousel} prev={f.prev} next={f.next}>
        {trending.map((p) => (
          <li key={p.slug} className="w-44 shrink-0 snap-start md:w-56">
            <ProductCard product={p} locale={locale} />
          </li>
        ))}
      </Carousel>

      {banner(1)}

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
                  href={`/${locale}/partenaires/${v.slug}`}
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

      <Carousel id="cre" title={f.artists} sub={f.artistsSub} href={`/${locale}/partenaires`}     seeAll={f.seeAll} hint={f.carousel} prev={f.prev} next={f.next}>
        {allCreators.map((c) => (
          <li key={c.slug} className="w-40 shrink-0 snap-start md:w-48 lg:w-64">
            <Link href={`/${locale}/partenaires/${c.slug}`} className="group block space-y-2">
              <span className="relative block aspect-square overflow-hidden bg-muted">
                <CreatorAvatar name={c.name} image={c.image} fill className="object-cover transition-transform group-hover:scale-105" />
              </span>
              <span className="block text-center text-sm font-semibold group-hover:underline">{c.name}</span>
            </Link>
          </li>
        ))}
      </Carousel>

      <Newsletter locale={locale} />

      <section aria-labelledby="help" className="space-y-4">
        <h2 id="help" className="font-heading text-2xl text-primary">{f.helpTitle}</h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {f.help.map((h) => (
            <li key={h.title}>
              <Link href={`/${locale}/support/${h.slug}`} className="block h-full rounded-lg border p-4 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring">
                <span className="block font-heading text-lg text-primary">{h.title}</span>
                <span className="block text-sm text-muted-foreground">{h.text}</span>
              </Link>
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
