import type { Metadata } from "next";
import { ShopRow } from "@/components/marketplace/shop-row";
import { ShopTopBar } from "@/components/marketplace/shop-topbar";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).f11.newTrending };
}

// Niveau 2 « Nouveautés et tendances » : pas de promotions ni de sélection personnalisée, seulement les nouveautés réelles.
export default async function ShopNewPage({ params }: Props) {
  const { locale } = await params;
  const t = getDict(locale).f11;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <ShopTopBar locale={locale} backHref={`/${locale}/boutique/categories`} />
      <h1 className="font-heading text-3xl font-normal text-primary">{t.newTrending}</h1>
      <ul>
        <ShopRow href={`/${locale}/catalogue?sort=new`} label={t.whatsNew} />
        <ShopRow href={`/${locale}/boutique/categories/nouveautes/decouvrir`} label={t.discover} />
      </ul>
    </div>
  );
}
