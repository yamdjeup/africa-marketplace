import { ruleFor, SIZE_OPTIONS } from "@/lib/category-rules";
import { db } from "@/lib/db";
import { CREATOR_VIDEOS } from "@/lib/creator-videos";
import { getCategories, getCreatorWithProducts, getCreators, getFilterOptions, getProduct, searchProducts, type CatalogParams, type ProductView } from "@/lib/catalog";

export type MobileLocale = "fr" | "en";

const num = (v: string | null) => {
  const n = v === null || v === "" ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const absolute = (url: string, origin: string) => (url.startsWith("/") ? `${origin}${url}` : url);

/** Images en URL absolue (l'app mobile n'a pas d'origine propre) ; lecture seule, aucune donnée privée. */
export function toMobileProduct(p: ProductView, origin: string, locale: MobileLocale) {
  return {
    slug: p.slug,
    name: p.name,
    description: p.description,
    story: p.story,
    categorySlug: p.categorySlug,
    creatorSlug: p.creatorSlug,
    creatorName: p.creatorName,
    priceCents: p.priceCents,
    images: p.images.map((i) => absolute(i, origin)),
    material: p.material,
    technique: p.technique,
    origin: p.origin,
    dimensions: p.dimensions,
    sizes: p.sizes,
    isNew: p.isNew,
    isExample: p.isExample,
    edition: p.edition,
    stock: p.stock,
    url: `${origin}/${locale}/produits/${p.slug}`,
  };
}

export const localeOf = (v: string | null): MobileLocale => (v === "en" ? "en" : "fr");

// Tailles proposées selon la catégorie (même règle que l'écran « Affiner » du site).
export function sizesFor(category: string | undefined) {
  const kind = ruleFor(category).sizeKind;
  return { kind: kind ?? null, options: kind ? SIZE_OPTIONS[kind] : [] };
}

export function paramsOf(sp: URLSearchParams): CatalogParams {
  const get = (k: string) => sp.get(k) || undefined;
  const sort = sp.get("sort");
  return {
    q: get("q"),
    category: get("category"),
    artist: get("artist"),
    material: get("material"),
    technique: get("technique"),
    country: get("country"),
    size: get("size"),
    min: num(sp.get("min")),
    max: num(sp.get("max")),
    page: num(sp.get("page")),
    sort: sort === "price-asc" || sort === "price-desc" || sort === "pick" ? sort : "new",
  };
}

export async function listProducts(sp: URLSearchParams, origin: string) {
  const locale = localeOf(sp.get("locale"));
  const params = paramsOf(sp);
  const [res, options] = await Promise.all([searchProducts(params, locale), getFilterOptions(locale, params.category)]);
  return { items: res.items.map((p) => toMobileProduct(p, origin, locale)), total: res.total, page: res.page, pages: res.pages, options, sizes: sizesFor(params.category) };
}

export async function oneProduct(slug: string, locale: MobileLocale, origin: string) {
  const p = await getProduct(slug, locale);
  return p ? toMobileProduct(p.product, origin, locale) : null;
}

export async function homeData(locale: MobileLocale, origin: string) {
  const [fresh, categories, creators] = await Promise.all([searchProducts({ sort: "new" }, locale), getCategories(locale), getCreators(locale, 12)]);
  const wrap = (p: ProductView) => toMobileProduct(p, origin, locale);
  const items = fresh.items;
  return {
    categories,
    news: items.filter((p) => p.isNew).slice(0, 10).map(wrap),
    latest: items.slice(0, 10).map(wrap),
    creators: creators.map((c) => ({ slug: c.slug, name: c.name, specialty: c.specialty, image: absolute(c.image, origin) })),
    byCategory: categories
      .map((c) => ({ ...c, items: items.filter((p) => p.categorySlug === c.slug).slice(0, 8).map(wrap) }))
      .filter((c) => c.items.length > 0),
  };
}

// Page artiste (src/app/[locale]/partenaires/[slug]/page.tsx) : bio, vidéo, phrase citée, créations ; ancien slug => slug actuel.
export async function oneCreator(slug: string, locale: MobileLocale, origin: string) {
  let data = await getCreatorWithProducts(slug, locale);
  if (!data) {
    const alias = await db.creatorSlugAlias.findUnique({ where: { oldSlug: slug } });
    if (alias) data = await getCreatorWithProducts(alias.creatorSlug, locale);
  }
  if (!data) return null;
  const { creator: c, products } = data;
  const v = CREATOR_VIDEOS[c.slug];
  const sentences = c.bio.match(/[^.!?]+[.!?]/g)?.map((s) => s.trim()) ?? [c.bio];
  return {
    slug: c.slug,
    name: c.name,
    specialty: c.specialty,
    image: absolute(c.image, origin),
    bio: v && sentences.length > 1 ? sentences.slice(0, -1).join(" ") : c.bio,
    sourceUrl: c.sourceUrl.includes("g3a.org") ? c.sourceUrl : null,
    video: v ? { src: absolute(v.src, origin), poster: absolute(v.poster, origin), orientation: v.orientation, excerpt: sentences[sentences.length - 1] } : null,
    products: products.map((p) => toMobileProduct(p, origin, locale)),
  };
}