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
  searchParams: Promise<{ category?: string | string[]; country?: string | string[] }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = getDict(locale).creator;
  const [all, cats] = await Promise.all([getCreators(locale), getCategories(locale)]);

  const catOptions = cats.filter((c) => all.some((a) => a.categories.includes(c.slug)));
  const list = (v?: string | string[]) => (Array.isArray(v) ? v : v ? [v] : []);
  const categories = list(sp.category).filter((k) => catOptions.some((c) => c.slug === k));
  const inCat = categories.length ? all.filter((a) => a.categories.some((k) => categories.includes(k))) : all;
  const countryOptions = [...new Map(inCat.flatMap((a) => a.countries).map((k) => [k.key, k.label] as const)).entries()].sort((a, b) =>
    a[1].localeCompare(b[1], locale),
  );
  const selected = list(sp.country).filter((k) => countryOptions.some(([o]) => o === k));
  const creators = selected.length ? inCat.filter((a) => a.countries.some((k) => selected.includes(k.key))) : inCat;
  const active = Boolean(categories.length || selected.length);

  const form = (
    <form method="get" key={`${categories}|${selected}`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <MultiFilter name="category" label={t.filterCategory} options={catOptions.map((c) => [c.slug, c.label] as const)} selected={categories} />
      <MultiFilter name="country" label={t.filterCountry} options={countryOptions} selected={selected} />
      <Button type="submit" className="h-11">
        {t.apply}
      </Button>
      <Link href={`/${locale}/partenaires`} className={buttonVariants({ variant: "outline", className: "h-11" })}>
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
          <Link href={`/${locale}/partenaires`} className={buttonVariants({ variant: "outline", className: "mt-4" })}>
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

function MultiFilter({ name, label, options, selected }: { name: string; label: string; options: readonly (readonly [string, string])[]; selected: string[] }) {
  return (
    <details className="relative text-xs font-medium">
      <summary className="flex h-11 cursor-pointer list-none items-center justify-between rounded-md border bg-background px-3 text-sm">
        <span>
          {label}
          {selected.length ? ` (${selected.length})` : ""}
        </span>
        <span aria-hidden>▾</span>
      </summary>
      <fieldset className="absolute z-10 mt-1 max-h-64 w-full min-w-56 space-y-1 overflow-y-auto rounded-md border bg-background p-2 shadow-md">
        <legend className="sr-only">{label}</legend>
        {options.map(([k, l]) => (
          <label key={k} className="flex min-h-9 items-center gap-2 text-sm font-normal">
            <input type="checkbox" name={name} value={k} defaultChecked={selected.includes(k)} />
            {l}
          </label>
        ))}
      </fieldset>
    </details>
  );
}