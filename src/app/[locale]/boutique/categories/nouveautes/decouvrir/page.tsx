import type { Metadata } from "next";
import { ShopRow } from "@/components/marketplace/shop-row";
import { ShopTopBar } from "@/components/marketplace/shop-topbar";
import { getCategoryShowcase } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).f11.discover };
}

export default async function ShopNewDiscoverPage({ params }: Props) {
  const { locale } = await params;
  const t = getDict(locale).f11;
  const cats = (await getCategoryShowcase(locale)).filter((c) => c.count > 0);
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <ShopTopBar locale={locale} backHref={`/${locale}/boutique/categories/nouveautes`} />
      <h1 className="font-heading text-3xl font-normal text-primary">{t.discover}</h1>
      <ul>
        <ShopRow href={`/${locale}/catalogue?sort=new`} label={t.seeAll} />
        {cats.map((c) => (
          <ShopRow key={c.slug} href={`/${locale}/catalogue?category=${c.slug}&sort=new`} label={t.newOf(c.label)} hint={t.pieces(c.count)} />
        ))}
      </ul>
    </div>
  );
}
