import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/marketplace/product-card";
import { Breadcrumb } from "@/components/marketplace/breadcrumb";
import { ruleFor, SIZE_OPTIONS } from "@/lib/category-rules";
import { Button, buttonVariants } from "@/components/ui/button";
import { getFilterOptions, searchProducts, type CatalogParams } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const num = (v: string | undefined) => {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).catalog.title };
}

const fieldClass = "h-11 w-full rounded-md border bg-background px-3 text-sm";

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = getDict(locale).catalog;

  const sortRaw = first(sp.sort);
  const query: CatalogParams = {
    q: first(sp.q),
    category: first(sp.category),
    artist: first(sp.artist),
    material: first(sp.material),
    technique: first(sp.technique),
    country: first(sp.country),
    size: first(sp.size),
    min: num(first(sp.min)),
    max: num(first(sp.max)),
    sort: sortRaw === "price-asc" || sortRaw === "price-desc" ? sortRaw : "new",
    page: num(first(sp.page)),
  };

  const options = await getFilterOptions(locale, query.category);
  // Un artiste sans œuvre dans la catégorie choisie est ignoré (réinitialisé).
  if (query.artist && !options.artists.some((a) => a.value === query.artist)) query.artist = undefined;
  const { items, total, page, pages } = await searchProducts(query, locale);
  const categoryLabel = options.categories.find((c) => c.value === query.category)?.label;
  const crumbs = [
    { label: t.home, href: `/${locale}` },
    ...(categoryLabel ? [{ label: t.title, href: `/${locale}/catalogue` }, { label: categoryLabel }] : [{ label: t.title }]),
  ];

  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, page: p > 1 ? p : undefined })) {
      if (v !== undefined && v !== "" && !(k === "sort" && v === "new")) qs.set(k, String(v));
    }
    const s = qs.toString();
    return `/${locale}/catalogue${s ? `?${s}` : ""}`;
  };

  const filtersActive = Boolean(
    query.q || query.category || query.artist || query.material || query.technique || query.country || query.size ||
      query.min !== undefined || query.max !== undefined,
  );
  const onlyCategory = Boolean(query.category) && !query.q && !query.artist && !query.material && !query.technique && !query.country && !query.size && query.min === undefined && query.max === undefined;

  return (
    <div className="space-y-6">
      <Breadcrumb items={crumbs} label={t.breadcrumb} />
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-heading text-3xl text-primary">{categoryLabel ?? t.title}</h1>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t.results(total)}
        </p>
      </div>

      <details className="rounded-lg border md:hidden" open={filtersActive}>
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium">{t.filters}</summary>
        <div className="border-t p-4">
          <Filters prefix="m" locale={locale} query={query} options={options} />
        </div>
      </details>
      <div className="hidden rounded-lg border p-4 md:block">
        <Filters prefix="d" locale={locale} query={query} options={options} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-heading text-xl">{onlyCategory ? t.emptyCategory : t.empty}</p>
          {!onlyCategory && <p className="mt-1 text-sm text-muted-foreground">{t.emptyHint}</p>}
          <Link href={`/${locale}/catalogue`} className={buttonVariants({ variant: "outline", className: "mt-4" })}>
            {t.reset}
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {items.map((p) => (
            <li key={p.slug}>
              <ProductCard product={p} locale={locale} soldOut={getDict(locale).product.outOfStock} />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className={buttonVariants({ variant: "outline" })}>
              {t.prev}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">{t.page(page, pages)}</span>
          {page < pages ? (
            <Link href={hrefFor(page + 1)} className={buttonVariants({ variant: "outline" })}>
              {t.next}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function Filters({
  locale,
  query,
  options,
  prefix,
}: {
  prefix: string;
  locale: Locale;
  query: CatalogParams;
  options: Awaited<ReturnType<typeof getFilterOptions>>;
}) {
  const t = getDict(locale).catalog;
  const id = (name: string) => `f-${prefix}-${name}`;
  const ids = { q: id("q"), cat: id("cat"), artist: id("artist"), min: id("min"), max: id("max"), sort: id("sort") };
  const sizeKind = ruleFor(query.category).sizeKind;
  const facets: { name: string; label: string; value?: string; options: { value: string; label: string }[] }[] = [
    { name: "material", label: t.material, value: query.material, options: options.materials },
    { name: "technique", label: t.technique, value: query.technique, options: options.techniques },
    { name: "country", label: t.country, value: query.country, options: options.countries },
    ...(sizeKind
      ? [{
          name: "size",
          label: sizeKind === "ring" ? t.sizeRing : t.size,
          value: query.size,
          options: SIZE_OPTIONS[sizeKind].map((s) => ({ value: s, label: s })),
        }]
      : []),
  ];
  return (
    <form key={JSON.stringify(query)} method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1 lg:col-span-2">
        <label htmlFor={ids.q} className="text-xs font-medium">{t.search}</label>
        <input id={ids.q} name="q" type="search" defaultValue={query.q} placeholder={t.searchPlaceholder} className={fieldClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor={ids.cat} className="text-xs font-medium">{t.category}</label>
        <select id={ids.cat} name="category" defaultValue={query.category ?? ""} className={fieldClass}>
          <option value="">{t.allF}</option>
          {options.categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor={ids.artist} className="text-xs font-medium">{t.artist}</label>
        <select id={ids.artist} name="artist" defaultValue={query.artist ?? ""} className={fieldClass}>
          <option value="">{t.all}</option>
          {options.artists.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      {facets.map((f) =>
        f.options.length > 0 ? (
          <div key={f.name} className="space-y-1">
            <label htmlFor={id(f.name)} className="text-xs font-medium">{f.label}</label>
            <select id={id(f.name)} name={f.name} defaultValue={f.value ?? ""} className={fieldClass}>
              <option value="">{f.name === "country" || f.name === "size" ? t.all : t.allF}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        ) : null,
      )}
      <fieldset className="space-y-1">
        <legend className="text-xs font-medium">{t.price}</legend>
        <div className="flex gap-2">
          <input id={ids.min} name="min" type="number" min={0} inputMode="numeric" defaultValue={query.min} placeholder={t.priceMin} aria-label={`${t.price} ${t.priceMin}`} className={fieldClass} />
          <input id={ids.max} name="max" type="number" min={0} inputMode="numeric" defaultValue={query.max} placeholder={t.priceMax} aria-label={`${t.price} ${t.priceMax}`} className={fieldClass} />
        </div>
      </fieldset>
      <div className="space-y-1">
        <label htmlFor={ids.sort} className="text-xs font-medium">{t.sort}</label>
        <select id={ids.sort} name="sort" defaultValue={query.sort} className={fieldClass}>
          <option value="new">{t.sortNew}</option>
          <option value="price-asc">{t.sortPriceAsc}</option>
          <option value="price-desc">{t.sortPriceDesc}</option>
        </select>
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" className="h-11">{t.apply}</Button>
        <Link href={`/${locale}/catalogue`} className={buttonVariants({ variant: "ghost", className: "h-11" })}>
          {t.reset}
        </Link>
      </div>
    </form>
  );
}
