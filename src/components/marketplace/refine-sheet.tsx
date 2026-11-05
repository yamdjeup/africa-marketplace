"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDict, type Locale } from "@/lib/i18n";
import { ruleFor, SIZE_OPTIONS } from "@/lib/category-rules";

type Opt = { value: string; label: string };
type Values = Record<"q" | "category" | "artist" | "material" | "technique" | "country" | "size" | "min" | "max" | "sort", string>;

export type RefineOptions = {
  categories: Opt[];
  artists: Opt[];
  materials: Opt[];
  techniques: Opt[];
  countries: Opt[];
};

const EMPTY: Values = { q: "", category: "", artist: "", material: "", technique: "", country: "", size: "", min: "", max: "", sort: "new" };

// Écran « Affiner » plein écran (mobile) : tri + filtres, avec nombre de résultats et options recalculés selon la catégorie avant validation.
export function RefineSheet({
  locale,
  options,
  initial,
  total,
}: {
  locale: Locale;
  options: RefineOptions;
  initial: Partial<Values>;
  total: number;
}) {
  const t = getDict(locale).f11;
  const c = getDict(locale).catalog;
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [v, setV] = useState<Values>({ ...EMPTY, ...initial });
  const [count, setCount] = useState<number | null>(null);
  const [opts, setOpts] = useState<RefineOptions>(options);

  const qs = (vals: Values) => {
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries(vals)) if (val && !(k === "sort" && val === "new")) p.set(k, val);
    return p.toString();
  };

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      const p = new URLSearchParams(qs(v));
      p.set("locale", locale);
      fetch(`/api/catalog/count?${p}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { total: number; options: RefineOptions }) => {
          setCount(d.total);
          setOpts(d.options);
          // Une sélection devenue absente des options de la catégorie est retirée.
          setV((s) => {
            const keep = (k: "artist" | "material" | "technique" | "country", list: Opt[]) => (s[k] && !list.some((o) => o.value === s[k]) ? "" : s[k]);
            const next = { ...s, artist: keep("artist", d.options.artists), material: keep("material", d.options.materials), technique: keep("technique", d.options.techniques), country: keep("country", d.options.countries) };
            return next.artist === s.artist && next.material === s.material && next.technique === s.technique && next.country === s.country ? s : next;
          });
        })
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, v]);

  const set = (k: keyof Values, val: string) => {
    setCount(null);
    setV((s) => ({ ...s, [k]: val }));
  };
  const activeCount = Object.entries({ ...EMPTY, ...initial }).filter(([k, val]) => val && !(k === "sort" && val === "new")).length;
  const sizeKind = ruleFor(v.category || undefined).sizeKind;
  const sizes = sizeKind ? SIZE_OPTIONS[sizeKind] : [];

  const select = (k: keyof Values, label: string, list: Opt[], all: string) =>
    list.length > 0 && (
      <details className="border-b" open={Boolean(v[k])}>
        <summary className="flex min-h-14 cursor-pointer items-center justify-between text-sm">
          <span>{label}</span>
          <span className="text-xs text-muted-foreground">{list.find((o) => o.value === v[k])?.label ?? all}</span>
        </summary>
        <div className="pb-2">
          {[{ value: "", label: all }, ...list].map((o) => (
            <label key={o.value} className="flex min-h-11 cursor-pointer items-center justify-between text-sm">
              {o.label}
              <input type="radio" name={`r-${k}`} checked={v[k] === o.value} onChange={() => set(k, o.value)} className="size-5 accent-black" />
            </label>
          ))}
        </div>
      </details>
    );

  return (
    <>
      <button type="button" onClick={() => { setV({ ...EMPTY, ...initial }); setOpts(options); setCount(total); setOpen(true); }} className="h-10 rounded-md border border-black px-4 text-sm hover:bg-black hover:text-white">
        {t.refine}
        {activeCount > 0 ? ` (${activeCount})` : ""}
      </button>
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const s = qs(v);
            router.push(`/${locale}/catalogue${s ? `?${s}` : ""}`);
            setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label={t.refine}
          className="fixed inset-0 z-40 flex flex-col bg-background"
        >
          <div className="flex items-center justify-between border-b px-2">
            <button type="button" onClick={() => setOpen(false)} aria-label={t.close} className="inline-flex min-h-12 min-w-12 items-center justify-center text-2xl">
              ✕
            </button>
            <button type="button" onClick={() => { setCount(null); setV(EMPTY); }} className="min-h-12 px-3 text-sm underline">
              {t.clearAll}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="pt-3">
              <input type="search" value={v.q} onChange={(e) => set("q", e.target.value)} placeholder={t.searchWorks} aria-label={t.searchWorks} className="h-11 w-full rounded-md bg-muted px-3 text-sm" />
            </div>
            <fieldset>
              <legend className="py-3 font-heading text-2xl text-primary">{t.sortBy}</legend>
              {([
                ["pick", t.ourPicks],
                ["new", c.sortNew],
                ["price-desc", c.sortPriceDesc],
                ["price-asc", c.sortPriceAsc],
              ] as const).map(([k, label]) => (
                <label key={k} className="flex min-h-12 cursor-pointer items-center justify-between border-b text-sm">
                  {label}
                  <input type="radio" name="sort" value={k} checked={v.sort === k} onChange={() => set("sort", k)} className="size-5 accent-black" />
                </label>
              ))}
            </fieldset>
            <h2 className="py-3 pt-6 font-heading text-2xl text-primary">{t.filterBy}</h2>
            {select("category", c.category, opts.categories, t.anyF)}
            {select("artist", t.artists, opts.artists, t.any)}
            {select("material", c.material, opts.materials, t.anyF)}
            {select("technique", c.technique, opts.techniques, t.anyF)}
            {select("country", c.country, opts.countries, t.any)}
            {sizes.length > 0 && select("size", sizeKind === "ring" ? c.sizeRing : t.sizes, sizes.map((s) => ({ value: s, label: s })), t.any)}
            <details className="border-b" open={Boolean(v.min || v.max)}>
              <summary className="flex min-h-14 cursor-pointer items-center text-sm">{t.priceRange}</summary>
              <div className="flex gap-2 pb-3">
                <input type="number" min={0} inputMode="numeric" value={v.min} onChange={(e) => set("min", e.target.value)} placeholder={c.priceMin} aria-label={`${c.price} ${c.priceMin}`} className="h-11 w-full rounded-md border px-3 text-sm" />
                <input type="number" min={0} inputMode="numeric" value={v.max} onChange={(e) => set("max", e.target.value)} placeholder={c.priceMax} aria-label={`${c.price} ${c.priceMax}`} className="h-11 w-full rounded-md border px-3 text-sm" />
              </div>
            </details>
          </div>
          {/* Valeurs sélectionnées envoyées au catalogue ; les champs vides sont omis côté serveur. */}
          <div className="border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="submit" className="h-12 w-full rounded-md bg-black text-sm font-medium text-white" aria-live="polite">
              {count === null ? t.counting : t.showResults(count)}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
