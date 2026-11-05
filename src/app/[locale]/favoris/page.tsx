import type { Metadata } from "next";
import { FavoritesList } from "@/components/marketplace/favorites-list";
import { searchProducts } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).favorites.title };
}

export default async function FavoritesPage({ params }: Props) {
  const { locale } = await params;
  // Les favoris vivent dans le navigateur : on fournit le catalogue, le client filtre.
  const { items } = await searchProducts({ page: 1 }, locale);
  return (
    <div className="space-y-6">
      <FavoritesList products={items} locale={locale} />
    </div>
  );
}
