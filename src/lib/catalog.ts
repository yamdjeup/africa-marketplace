import "server-only";
import type { Creator, Product } from "@prisma/client";
import { db } from "@/lib/db";
import { pick, type Locale } from "@/lib/i18n";
import { slugify } from "@/lib/category-rules";

export const PAGE_SIZE = 24;

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
  stock: number;
};

export type CreatorView = {
  slug: string;
  name: string;
  specialty: string;
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
    stock: p.stock,
  };
}

export function toCreatorView(c: Creator, locale: Locale): CreatorView {
  return {
    slug: c.slug,
    name: c.name,
    specialty: pick(locale, c.specialty, c.specialtyEn),
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
  sort?: "new" | "price-asc" | "price-desc";
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
          : { createdAt: "desc" },
  });

  // Filtres matière/technique/pays/taille et recherche texte en JS (portable SQLite/PostgreSQL ; catalogue de taille modeste).
  const q = params.q ? normalize(params.q.trim()) : "";
  const matched = rows.filter((p) => {
    if (params.material && !(p.material && slugify(p.material) === params.material)) return false;
    if (params.technique && !(p.technique && slugify(p.technique) === params.technique)) return false;
    if (params.country && !(p.country && slugify(p.country) === params.country)) return false;
    if (params.size && !strings(p.sizes).includes(params.size)) return false;
    if (!q) return true;
    return normalize(
      [p.name, p.nameEn, p.description, p.descriptionEn, p.creator.name, JSON.stringify(p.materials)].join(" "),
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

export async function getFilterOptions(locale: Locale, category?: string) {
  const [categories, artists, scoped] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.creator.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    db.product.findMany({ where: category ? { categorySlug: category } : {} }),
  ]);
  return {
    categories: categories.map((c) => ({ value: c.slug, label: pick(locale, c.name, c.nameEn) })),
    artists: artists.map((a) => ({ value: a.slug, label: a.name })),
    materials: facet(scoped, locale, "material", "materialEn"),
    techniques: facet(scoped, locale, "technique", "techniqueEn"),
    countries: facet(scoped, locale, "country", "countryEn"),
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

export async function getCreators(locale: Locale, take?: number) {
  const rows = await db.creator.findMany({ orderBy: { name: "asc" }, take });
  return rows.map((c) => toCreatorView(c, locale));
}

export async function getCreatorWithProducts(slug: string, locale: Locale) {
  const c = await db.creator.findUnique({
    where: { slug },
    include: { products: { include: withCreator, orderBy: { createdAt: "desc" } } },
  });
  if (!c) return null;
  return { creator: toCreatorView(c, locale), products: c.products.map((p) => toProductView(p, locale)) };
}

export async function getCategories(locale: Locale) {
  const rows = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((c) => ({ slug: c.slug, label: pick(locale, c.name, c.nameEn) }));
}
