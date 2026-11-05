import type { Metadata } from "next";
import { ShopRow } from "@/components/marketplace/shop-row";
import { ShopTabs } from "@/components/marketplace/shop-tabs";
import { ShopTopBar } from "@/components/marketplace/shop-topbar";
import { getCategoryShowcase } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";
import { parseTab, tabOf } from "@/lib/shop-groups";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).f11.categoriesTitle };
}

export default async function ShopCategoriesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const tab = parseTab((await searchParams).tab);
  const t = getDict(locale).f11;
  const cats = (await getCategoryShowcase(locale)).filter((c) => c.count > 0 && (tab === "all" || tabOf(c.slug) === tab));
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <ShopTopBar locale={locale} backHref={`/${locale}/boutique`} title={t.categoriesTitle} />
      <h1 className="sr-only">{t.categoriesTitle}</h1>
      <ShopTabs locale={locale} base={`/${locale}/boutique/categories`} current={tab} />
      <ul>
        <ShopRow href={`/${locale}/boutique/categories/nouveautes`} label={getDict(locale).f11.newTrending} />
        {cats.map((c) => (
          <ShopRow key={c.slug} href={`/${locale}/boutique/categories/${c.slug}`} label={c.label} hint={t.pieces(c.count)} />
        ))}
      </ul>
    </div>
  );
}
