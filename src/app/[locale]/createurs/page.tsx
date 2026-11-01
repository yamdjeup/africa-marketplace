import type { Metadata } from "next";
import { CreatorCard } from "@/components/marketplace/creator-card";
import { getCreators } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).creator.creators };
}

export default async function CreatorsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const creators = await getCreators(locale);
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl text-primary">{getDict(locale).creator.creators}</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {creators.map((c) => (
          <li key={c.slug}>
            <CreatorCard creator={c} locale={locale} />
          </li>
        ))}
      </ul>
    </div>
  );
}
