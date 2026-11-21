import { ruleFor, SIZE_OPTIONS } from "@/lib/category-rules";
import { db } from "@/lib/db";
import { CREATOR_VIDEOS } from "@/lib/creator-videos";
import { MIRROR_CATEGORIES, MIRROR_ITEMS } from "@/data/mirror-items";
import { CREATOR_VIDEO_SHOWCASE } from "@/data/creator-videos";
import { showHoldNotice } from "@/lib/hold-notice";
import { getDict } from "@/lib/i18n";
import { getCategories, getCategoryShowcase, getFeaturedProducts, getHeroProduct, getCreatorWithProducts, getCreators, getFilterOptions, getProduct, getRelatedProducts, searchProducts, type CatalogParams, type ProductView } from "@/lib/catalog";

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
    sizes: p.variants.length > 0 ? p.variants.map((v) => v.label) : ruleFor(p.categorySlug).sizeKind ? p.sizes : [],
    sizeStock: p.variants.length > 0 ? Object.fromEntries(p.variants.map((v) => [v.label, v.available])) : null,
    sizeLabel: p.variants.length > 0 ? (locale === "fr" ? "Taille / couleur" : "Size / colour") : ruleFor(p.categorySlug).sizeKind === "ring" ? (locale === "fr" ? "Tour de doigt" : "Ring size") : locale === "fr" ? "Taille" : "Size",
    isNew: p.isNew,
    isExample: p.isExample,
    edition: p.edition,
    stock: p.stock,
    soldOut: p.stock <= 0 || (p.variants.length > 0 && p.variants.every((v) => v.available <= 0)),
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
    inStock: sp.get("inStock") === "1" || sp.get("inStock") === "true" || undefined,
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
  const [p, more] = await Promise.all([getProduct(slug, locale), getRelatedProducts(slug, locale, 4)]);
  if (!p) return null;
  const v = p.product;
  const soldOut = v.stock <= 0 || (v.variants.length > 0 && v.variants.every((x) => x.available <= 0));
  const raw = soldOut ? await db.product.findUnique({ where: { slug }, select: { reserved: true } }) : null;
  const rule = ruleFor(v.categorySlug);
  const cm = [v.widthCm, v.heightCm, v.depthCm].filter((x): x is number => x != null).join(" × ");
  return {
    ...toMobileProduct(v, origin, locale),
    heldByOther: showHoldNotice({ soldOut, reserved: raw?.reserved ?? 0, ownHold: false }),
    categoryLabel: p.categoryLabel,
    materials: v.materials,
    dimensionsText: rule.dimensions ? (cm ? `${cm} cm` : v.dimensions) : null,
    careInstructions: rule.care ? v.careInstructions : null,
    hasCertificate: v.hasCertificate,
    roomPreview: ["peinture", "sculpture", "photographie", "textile-decoration"].includes(v.categorySlug) && !!v.widthCm && !!v.heightCm && v.widthCm > 0 && v.heightCm > 0 && v.images.length > 0,
    mirrorTryOn: MIRROR_CATEGORIES.includes(v.categorySlug) && v.images.length > 0 && !!MIRROR_ITEMS[v.slug],
    attestedAt: v.attestedAt,
    signatureUrl: v.signatureUrl && v.attestedAt ? absolute(v.signatureUrl, origin) : null,
    related: more.map((m) => toMobileProduct(m, origin, locale)),
  };
}

export async function homeData(locale: MobileLocale, origin: string) {
  const [fresh, categories, creators, featured, showcase, hero, allCreators] = await Promise.all([searchProducts({ sort: "new" }, locale), getCategories(locale), getCreators(locale, 12), getFeaturedProducts(locale, 16), getCategoryShowcase(locale), getHeroProduct(locale), getCreators(locale)]);
  const wrap = (p: ProductView) => toMobileProduct(p, origin, locale);
  const items = fresh.items;
  const t = getDict(locale);
  const heroProduct = hero ?? featured[0];
  const banners = ["couture-mode", "peinture"].flatMap((s) => showcase.filter((c) => c.slug === s && c.count > 0 && c.image));
  const videos = CREATOR_VIDEO_SHOWCASE.flatMap((v) => {
    const c = allCreators.find((x) => x.slug === v.slug);
    return c ? [{ slug: v.slug, name: c.name, poster: absolute(v.poster, origin) }] : [];
  });
  const f = t.f4;
  return {
    categories,
    news: items.filter((p) => p.isNew).slice(0, 10).map(wrap),
    latest: items.slice(0, 10).map(wrap),
    creators: creators.map((c) => ({ slug: c.slug, name: c.name, specialty: c.specialty, image: absolute(c.image, origin) })),
    byCategory: categories
      .map((c) => ({ ...c, items: items.filter((p) => p.categorySlug === c.slug).slice(0, 8).map(wrap) }))
      .filter((c) => c.items.length > 0),
    // Page d'accueil du site (src/app/[locale]/page.tsx) : mêmes blocs, mêmes textes (i18n).
    site: {
      promoBar: f.promoBar,
      hero: { kicker: t.home.heroKicker, title: t.home.heroTitle, text: t.home.heroText, cta: t.home.heroCta, product: heroProduct ? wrap(heroProduct) : null },
      categoriesTitle: t.home.categories,
      categoryTiles: showcase.map((c) => ({ slug: c.slug, label: c.label, count: c.count, image: c.image ? absolute(c.image, origin) : null, countText: c.count > 0 ? t.home.worksCount(c.count) : t.home.soon })),
      newIn: { title: f.newIn, sub: f.newInSub, items: featured.slice(0, 8).map(wrap) },
      trending: { title: f.trending, sub: f.trendingSub, items: (featured.length > 8 ? featured.slice(8) : featured).map(wrap) },
      banners: banners.map((c) => ({ slug: c.slug, label: c.label, image: absolute(c.image!, origin), cta: f.seeAll })),
      videos: { title: t.home.videosTitle, intro: t.home.videosIntro, watch: t.home.watch, items: videos },
      artists: { title: f.artists, sub: f.artistsSub, items: allCreators.map((c) => ({ slug: c.slug, name: c.name, image: absolute(c.image, origin) })) },
      newsletter: { title: f.newsTitle, text: f.newsText, email: f.newsEmail, submit: f.newsSubmit, consent: f.newsConsent, ok: f.newsOk, invalid: f.newsInvalid },
      help: { title: f.helpTitle, items: f.help },
      about: { title: t.home.aboutTitle, text: t.home.aboutText },
    },
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
    madeIn: c.madeIn,
    countries: c.countries.map((k) => k.label),
    image: absolute(c.image, origin),
    bio: v && sentences.length > 1 ? sentences.slice(0, -1).join(" ") : c.bio,
    sourceUrl: c.sourceUrl.includes("g3a.org") ? c.sourceUrl : null,
    video: v ? { src: absolute(v.src, origin), poster: absolute(v.poster, origin), orientation: v.orientation, excerpt: sentences[sentences.length - 1] } : null,
    products: products.map((p) => toMobileProduct(p, origin, locale)),
  };
}