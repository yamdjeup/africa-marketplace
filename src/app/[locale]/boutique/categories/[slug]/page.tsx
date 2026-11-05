import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopRow } from "@/components/marketplace/shop-row";
import { ShopTopBar } from "@/components/marketplace/shop-topbar";
import { getCategoryShowcase } from "@/lib/catalog";
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
  const cat = (await getCategoryShowcase(locale)).find((c) => c.slug === slug);
  if (!cat) notFound();
  const base = `/${locale}/boutique/categories/${slug}`;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <ShopTopBar locale={locale} backHref={`/${locale}/boutique/categories`} />
      <h1 className="font-heading text-3xl font-normal text-primary">{cat.label}</h1>
      <ul>
        <ShopRow href={`${base}/explorer`} label={cat.label} hint={t.pieces(cat.count)} />
        <ShopRow href={`${base}/decouvrir`} label={t.discover} />
      </ul>
    </div>
  );
}
