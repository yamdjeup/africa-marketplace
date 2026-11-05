import "server-only";
import { unstable_cache } from "next/cache";
import type { Creator, Product } from "@prisma/client";
import { db } from "@/lib/db";
import { pick, type Locale } from "@/lib/i18n";
import { slugify } from "@/lib/category-rules";
import { isExampleProduct } from "@/lib/examples";
import { CREATOR_COUNTRIES } from "@/data/creator-country";

export const PAGE_SIZE = 24;
const NEW_DAYS = 60;

export type ProductView = {
  slug: string;
  name: string;
  description: string;
  story: string;
  categorySlug: string;
  creatorSlug: string;
  creatorName: string;
  priceCents: number;
  sizes: string[];
  images: string[];
  materials: string[];
  dimensions: string | null;
  material: string | null;
  technique: string | null;
  origin: string | null;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  careInstructions: string | null;
  hasCertificate: boolean;
  /** Mise en ligne il y a moins de NEW_DAYS jours (d'après createdAt). */
  isNew: boolean;
  /** Pièce fictive « Exemple » (essayage au Miroir). */
  isExample: boolean;
  stock: number;
};

export type CreatorView = {
  slug: string;
  name: string;
  specialty: string;
  countries: { key: string; label: string }[];
  categories: string[];
  bio: string;
  image: string;
  sourceUrl: string;
};

type ProductRow = Product & { creator: Pick<Creator, "name"> };

const strings = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

export function toProductView(p: ProductRow, locale: Locale): ProductView {
  const materials = (Array.isArray(p.materials) ? p.materials : []) as { fr: string; en: string }[];
  return {
    slug: p.slug,
    name: pick(locale, p.name, p.nameEn),
    description: pick(locale, p.description, p.descriptionEn),
    story: pick(locale, p.story, p.storyEn),
    categorySlug: p.categorySlug,
    creatorSlug: p.creatorSlug,
    creatorName: p.creator.name,
    priceCents: p.priceCents,
    sizes: strings(p.sizes),
    images: strings(p.images),
    materials: materials.map((m) => pick(locale, m.fr, m.en)),
    dimensions: p.dimensions,
    material: p.material ? pick(locale, p.material, p.materialEn ?? p.material) : null,
    technique: p.technique ? pick(locale, p.technique, p.techniqueEn ?? p.technique) : null,
    origin:
      [p.region && pick(locale, p.region, p.regionEn ?? p.region), p.country && pick(locale, p.country, p.countryEn ?? p.country)]
        .filter(Boolean)
        .reverse()
        .join(", ") || null,
    widthCm: p.widthCm,
    heightCm: p.heightCm,
    depthCm: p.depthCm,
    careInstructions: p.careInstructions ? pick(locale, p.careInstructions, p.careInstructionsEn ?? p.careInstructions) : null,
    hasCertificate: p.hasCertificate,
    isNew: Date.now() - p.createdAt.getTime() < NEW_DAYS * 86_400_000,
    isExample: isExampleProduct(p.slug),
    stock: p.stock,
  };
}

const CATEGORY_ORDER = ["peinture", "sculpture", "photographie", "couture-mode", "bijoux", "textile-decoration"];

export function toCreatorView(c: Creator, locale: Locale, cats: { slug: string; label: string }[] = []): CreatorView {
  const countries = (CREATOR_COUNTRIES[c.slug] ?? []).map((k) => ({ key: k.key, label: pick(locale, k.fr, k.en) }));
  const sorted = [...cats].sort((a, b) => CATEGORY_ORDER.indexOf(a.slug) - CATEGORY_ORDER.indexOf(b.slug));
  const type = sorted.length ? sorted.map((x) => x.label).join(", ") : pick(locale, c.specialty, c.specialtyEn);
  return {
    slug: c.slug,
    name: c.name,
    specialty: type,
    countries,
    categories: sorted.map((x) => x.slug),
    bio: pick(locale, c.bio, c.bioEn),
    image: c.image,
    sourceUrl: c.sourceUrl,
  };
}

const withCreator = { creator: { select: { name: true } } } as const;

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export type CatalogParams = {
  q?: string;
  category?: string;
  artist?: string;
  material?: string;
  technique?: string;
  country?: string;
  size?: string;
  min?: number;
  max?: number;
  sort?: "new" | "pick" | "price-asc" | "price-desc";
  page?: number;
};

export async function searchProducts(params: CatalogParams, locale: Locale) {
  const rows = await db.product.findMany({
    where: {
      ...(params.category ? { categorySlug: params.category } : {}),
      ...(params.artist ? { creatorSlug: params.artist } : {}),
      priceCents: {
        ...(params.min !== undefined ? { gte: Math.round(params.min * 100) } : {}),
        ...(params.max !== undefined ? { lte: Math.round(params.max * 100) } : {}),
      },
    },
    include: withCreator,
    orderBy:
      params.sort === "price-asc"
        ? { priceCents: "asc" }
        : params.sort === "price-desc"
          ? { priceCents: "desc" }
          : params.sort === "pick"
            ? [{ creatorSlug: "asc" }, { createdAt: "desc" }]
            : { createdAt: "desc" },
  });

  // Filtres matière/technique/pays/taille et recherche texte en JS (portable SQLite/PostgreSQL ; catalogue de taille modeste).
  const q = params.q ? normalize(params.q.trim()) : "";
  const cats = q ? await db.category.findMany() : [];
  const catText = new Map(cats.map((c) => [c.slug, `${c.name} ${c.nameEn}`]));
  const matched = rows.filter((p) => {
    if (params.material && !(p.material && slugify(p.material) === params.material)) return false;
    if (params.technique && !(p.technique && slugify(p.technique) === params.technique)) return false;
    if (params.country && !(p.country && slugify(p.country) === params.country) && !(CREATOR_COUNTRIES[p.creatorSlug] ?? []).some((c) => c.key === params.country)) return false;
    if (params.size && !strings(p.sizes).includes(params.size)) return false;
    if (!q) return true;
    const artistCountries = (CREATOR_COUNTRIES[p.creatorSlug] ?? []).map((c) => `${c.fr} ${c.en}`);
    return normalize(
      [
        p.name, p.nameEn, p.description, p.descriptionEn, p.creator.name, JSON.stringify(p.materials),
        p.country, p.countryEn, p.technique, p.techniqueEn, p.material, p.materialEn,
        catText.get(p.categorySlug), ...artistCountries,
      ].filter(Boolean).join(" "),
    ).includes(q);
  });

  const pages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page ?? 1), pages);
  const items = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => toProductView(p, locale));
  return { items, total: matched.length, page, pages };
}

type Option = { value: string; label: string };

function facet(rows: Product[], locale: Locale, fr: "material" | "technique" | "country", en: "materialEn" | "techniqueEn" | "countryEn"): Option[] {
  const map = new Map<string, string>();
  for (const p of rows) {
    const v = p[fr];
    if (v) map.set(slugify(v), pick(locale, v, p[en] ?? v));
  }
  return [...map].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, locale));
}

async function getFilterOptionsRaw(locale: Locale, category?: string) {
  const [categories, artists, scoped] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.creator.findMany({
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
      ...(category ? { where: { products: { some: { categorySlug: category } } } } : {}),
    }),
    db.product.findMany({ where: category ? { categorySlug: category } : {} }),
  ]);
  return {
    categories: categories.map((c) => ({ value: c.slug, label: pick(locale, c.name, c.nameEn) })),
    artists: artists.map((a) => ({ value: a.slug, label: a.name })),
    materials: facet(scoped, locale, "material", "materialEn"),
    techniques: facet(scoped, locale, "technique", "techniqueEn"),
    countries: (() => {
      const m = new Map(facet(scoped, locale, "country", "countryEn").map((o) => [o.value, o.label] as const));
      for (const p of scoped) for (const k of CREATOR_COUNTRIES[p.creatorSlug] ?? []) if (!m.has(k.key)) m.set(k.key, pick(locale, k.fr, k.en));
      return [...m].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, locale));
    })(),
  };
}

export async function getProduct(slug: string, locale: Locale) {
  const p = await db.product.findUnique({ where: { slug }, include: { creator: true, category: true } });
  if (!p) return null;
  return {
    product: toProductView(p, locale),
    creator: toCreatorView(p.creator, locale),
    categoryLabel: pick(locale, p.category.name, p.category.nameEn),
  };
}

export async function getFeaturedProducts(locale: Locale, take = 8) {
  const rows = await db.product.findMany({ include: withCreator, orderBy: { createdAt: "desc" }, take });
  return rows.map((p) => toProductView(p, locale));
}

/** Visuel du bandeau d'accueil : une œuvre d'art (pas de pièce de couture), la plus récente. */
export async function getHeroProduct(locale: Locale) {
  const row = await db.product.findFirst({
    where: { categorySlug: { in: ["peinture", "sculpture", "photographie"] } },
    include: withCreator,
    orderBy: { createdAt: "desc" },
  });
  return row ? toProductView(row, locale) : null;
}

export async function getCreators(locale: Locale, take?: number) {
  const [rows, cats] = await Promise.all([
    db.creator.findMany({ orderBy: { name: "asc" }, take, include: { products: { select: { categorySlug: true } } } }),
    getCategories(locale),
  ]);
  return rows.map((c) => toCreatorView(c, locale, creatorCats(c.products, cats)));
}

function creatorCats(products: { categorySlug: string }[], cats: { slug: string; label: string }[]) {
  const own = new Set(products.map((p) => p.categorySlug));
  return cats.filter((c) => own.has(c.slug));
}

export async function getCreatorWithProducts(slug: string, locale: Locale) {
  const [c, cats] = await Promise.all([
    db.creator.findUnique({
      where: { slug },
      include: { products: { include: withCreator, orderBy: { createdAt: "desc" } } },
    }),
    getCategories(locale),
  ]);
  if (!c) return null;
  return { creator: toCreatorView(c, locale, creatorCats(c.products, cats)), products: c.products.map((p) => toProductView(p, locale)) };
}

// Données identiques pour tous les visiteurs : cache serveur 60 s (pas de données par utilisateur ici).
export const getCategories = unstable_cache(getCategoriesRaw, ["catalog-categories"], { revalidate: 60 });
export const getCategoryMenu = unstable_cache(getCategoryMenuRaw, ["catalog-menu"], { revalidate: 60 });
export const getCategoryShowcase = unstable_cache(getCategoryShowcaseRaw, ["catalog-showcase"], { revalidate: 60 });
export const getFilterOptions = unstable_cache(getFilterOptionsRaw, ["catalog-filter-options"], { revalidate: 60 });

async function getCategoriesRaw(locale: Locale) {
  const rows = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((c) => ({ slug: c.slug, label: pick(locale, c.name, c.nameEn) }));
}

/** Menu desktop : par catégorie, artistes et pays des œuvres présentes. */
async function getCategoryMenuRaw(locale: Locale) {
  const [cats, rows] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.product.findMany({ select: { categorySlug: true, country: true, countryEn: true, creator: { select: { slug: true, name: true } } } }),
  ]);
  return cats.map((c) => {
    const own = rows.filter((r) => r.categorySlug === c.slug);
    const artists = new Map(own.map((r) => [r.creator.slug, r.creator.name]));
    const countries = new Map(
      own.flatMap((r) => [
        ...(CREATOR_COUNTRIES[r.creator.slug] ?? []).map((k) => [k.key, pick(locale, k.fr, k.en)] as const),
        ...(r.country ? [[slugify(r.country), pick(locale, r.country, r.countryEn ?? r.country)] as const] : []),
      ]),
    );
    return {
      slug: c.slug,
      label: pick(locale, c.name, c.nameEn),
      artists: [...artists].map(([slug, name]) => ({ slug, name })),
      countries: [...countries].map(([value, label]) => ({ value, label })),
    };
  });
}

/** Une bannière par catégorie : visuel de l'œuvre la plus récente et nombre d'œuvres (0 = catégorie vide). */
async function getCategoryShowcaseRaw(locale: Locale) {
  const [cats, rows] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.product.findMany({ orderBy: { createdAt: "desc" }, select: { categorySlug: true, images: true, name: true, nameEn: true } }),
  ]);
  return cats.map((c) => {
    const own = rows.filter((r) => r.categorySlug === c.slug);
    return {
      slug: c.slug,
      label: pick(locale, c.name, c.nameEn),
      count: own.length,
      image: own[0] ? (strings(own[0].images)[0] ?? null) : null,
      imageAlt: own[0] ? pick(locale, own[0].name, own[0].nameEn) : "",
    };
  });
}

/** Œuvres proches : même artiste d'abord, puis même catégorie, puis même matière ; hors œuvre courante. */
export async function getRelatedProducts(slug: string, locale: Locale, take = 4) {
  const cur = await db.product.findUnique({ where: { slug } });
  if (!cur) return [];
  const rows = await db.product.findMany({ where: { slug: { not: slug } }, include: withCreator, orderBy: { createdAt: "desc" } });
  const score = (p: Product) =>
    (p.creatorSlug === cur.creatorSlug ? 4 : 0) +
    (p.categorySlug === cur.categorySlug ? 2 : 0) +
    (p.material && p.material === cur.material ? 1 : 0);
  return rows
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, take)
    .map((x) => toProductView(x.p, locale));
}
