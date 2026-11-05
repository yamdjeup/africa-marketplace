import type { Metadata } from "next";
import { ArtistDirectory } from "@/components/marketplace/artist-directory";
import { ShopTabs } from "@/components/marketplace/shop-tabs";
import { ShopTopBar } from "@/components/marketplace/shop-topbar";
import { getCreators } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";
import { parseTab, tabOf } from "@/lib/shop-groups";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).f11.artistsTitle };
}

export default async function ShopArtistsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const tab = parseTab((await searchParams).tab);
  const t = getDict(locale).f11;
  const all = await getCreators(locale);
  const list = all
    .filter((c) => tab === "all" || c.categories.some((k) => tabOf(k) === tab))
    .map((c) => ({ slug: c.slug, name: c.name, countries: c.countries }));
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <ShopTopBar locale={locale} backHref={`/${locale}/boutique`} title={t.artistsTitle} />
      <h1 className="sr-only">{t.artistsTitle}</h1>
      <ShopTabs locale={locale} base={`/${locale}/boutique/artistes`} current={tab} />
      <ArtistDirectory key={tab} locale={locale} artists={list} />
    </div>
  );
}
