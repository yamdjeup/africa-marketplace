import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopRow } from "@/components/marketplace/shop-row";
import { ShopTopBar } from "@/components/marketplace/shop-topbar";
import { getCategoryMenu, getCategoryShowcase, getFilterOptions } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale; slug: string; view: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = (await getCategoryShowcase(locale)).find((x) => x.slug === slug);
  return { title: c?.label ?? getDict(locale).f11.categoriesTitle };
}

// Niveaux 3 et 4 générés (aucune sous-catégorie en base) : explorer = techniques/matières, découvrir = nouveautés + artistes, artistes = niveau 4.
export default async function ShopCategoryViewPage({ params }: Props) {
  const { locale, slug, view } = await params;
  if (view !== "explorer" && view !== "decouvrir" && view !== "artistes") notFound();
  const t = getDict(locale).f11;
  const [showcase, menu, options] = await Promise.all([getCategoryShowcase(locale), getCategoryMenu(locale), getFilterOptions(locale, slug)]);
  const cat = showcase.find((c) => c.slug === slug);
  if (!cat) notFound();
  const artists = menu.find((m) => m.slug === slug)?.artists ?? [];
  const base = `/${locale}/boutique/categories/${slug}`;
  const href = (qs: string) => `/${locale}/catalogue?category=${slug}${qs}`;
  const back = view === "artistes" ? `${base}/decouvrir` : base;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <ShopTopBar locale={locale} backHref={back} />
      <h1 className="font-heading text-3xl font-normal text-primary">{view === "artistes" ? t.artists : view === "decouvrir" ? t.discover : cat.label}</h1>
      <ul>
        {view === "explorer" && (
          <>
            <ShopRow href={href("")} label={t.allOf(cat.label)} hint={t.pieces(cat.count)} />
            {options.techniques.map((o) => (
              <ShopRow key={`t-${o.value}`} href={href(`&technique=${o.value}`)} label={o.label} />
            ))}
            {options.materials.map((o) => (
              <ShopRow key={`m-${o.value}`} href={href(`&material=${o.value}`)} label={o.label} />
            ))}
          </>
        )}
        {view === "decouvrir" && (
          <>
            <ShopRow href={href("&sort=new")} label={t.newOf(cat.label)} />
            <ShopRow href={`${base}/artistes`} label={t.artists} hint={String(artists.length)} />
          </>
        )}
        {view === "artistes" &&
          artists.map((a) => <ShopRow key={a.slug} href={href(`&artist=${a.slug}`)} label={a.name} />)}
      </ul>
    </div>
  );
}
