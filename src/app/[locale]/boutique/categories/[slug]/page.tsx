import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopRow } from "@/components/marketplace/shop-row";
import { ShopTopBar } from "@/components/marketplace/shop-topbar";
import { getCategoryMenu, getCategoryShowcase, getFilterOptions } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = (await getCategoryShowcase(locale)).find((x) => x.slug === slug);
  return { title: c?.label ?? getDict(locale).f11.categoriesTitle };
}

export default async function ShopCategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  const t = getDict(locale).f11;
  const [showcase, menu, options] = await Promise.all([getCategoryShowcase(locale), getCategoryMenu(locale), getFilterOptions(locale, slug)]);
  const cat = showcase.find((c) => c.slug === slug);
  if (!cat) notFound();
  const artists = menu.find((m) => m.slug === slug)?.artists ?? [];
  const href = (qs: string) => `/${locale}/catalogue?category=${slug}${qs}`;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <ShopTopBar locale={locale} backHref={`/${locale}/boutique/categories`} />
      <h1 className="font-heading text-3xl font-normal text-primary">{cat.label}</h1>
      <ul>
        <ShopRow href={href("")} label={t.seeAllCount(cat.count)} />
      </ul>
      {options.techniques.length > 0 && (
        <section className="space-y-1">
          <h2 className="border-b pb-2 font-heading text-xl text-primary">{t.technique}</h2>
          <ul>
            {options.techniques.map((o) => (
              <ShopRow key={o.value} href={href(`&technique=${o.value}`)} label={o.label} />
            ))}
          </ul>
        </section>
      )}
      {artists.length > 0 && (
        <section className="space-y-1">
          <h2 className="border-b pb-2 font-heading text-xl text-primary">{t.artists}</h2>
          <ul>
            {artists.map((a) => (
              <ShopRow key={a.slug} href={href(`&artist=${a.slug}`)} label={a.name} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
