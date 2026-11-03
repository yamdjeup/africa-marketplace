import type { Metadata } from "next";
import { CreatorCard } from "@/components/marketplace/creator-card";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { getCategories, getCreators } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).creator.creators };
}

const fieldClass = "h-11 w-full rounded-md border bg-background px-3 text-sm";

export default async function CreatorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ category?: string; country?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = getDict(locale).creator;
  const [all, cats] = await Promise.all([getCreators(locale), getCategories(locale)]);

  const catOptions = cats.filter((c) => all.some((a) => a.categories.includes(c.slug)));
  const category = catOptions.some((c) => c.slug === sp.category) ? sp.category : undefined;
  const inCat = category ? all.filter((a) => a.categories.includes(category)) : all;
  const countryOptions = [...new Map(inCat.filter((a) => a.countryKey).map((a) => [a.countryKey!, a.countryLabel!])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1], locale),
  );
  const country = countryOptions.some(([k]) => k === sp.country) ? sp.country : undefined;
  const creators = country ? inCat.filter((a) => a.countryKey === country) : inCat;
  const active = Boolean(category || country);

  const form = (
    <form method="get" key={`${category}|${country}`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <label className="space-y-1 text-xs font-medium">
        {t.filterCategory}
        <select name="category" defaultValue={category ?? ""} className={fieldClass}>
          <option value="">{t.all}</option>
          {catOptions.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-xs font-medium">
        {t.filterCountry}
        <select name="country" defaultValue={country ?? ""} className={fieldClass}>
          <option value="">{t.allCountries}</option>
          {countryOptions.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" className="h-11">
        {t.apply}
      </Button>
      <Link href={`/${locale}/createurs`} className={buttonVariants({ variant: "ghost", className: "h-11" })}>
        {t.reset}
      </Link>
    </form>
  );

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl text-primary">{t.creators}</h1>
      <details className="rounded-lg border md:hidden" open={active}>
        <summary className="cursor-pointer p-3 text-sm font-medium">{t.filters}</summary>
        <div className="p-3 pt-0">{form}</div>
      </details>
      <div className="hidden rounded-lg border p-4 md:block">{form}</div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t.results(creators.length)}
      </p>
      {creators.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground">{t.empty}</p>
          <Link href={`/${locale}/createurs`} className={buttonVariants({ variant: "outline", className: "mt-4" })}>
            {t.reset}
          </Link>
        </div>
      )}
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
