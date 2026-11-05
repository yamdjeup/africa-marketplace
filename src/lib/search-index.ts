import { normalize, tokenInWords, tokenize, closeness, synonymCategorySlugs } from "@/lib/search-core";

export type SearchIndex = {
  creators: { slug: string; name: string; image: string; specialty: string; specialtyEn: string; core: string[]; bio: string[] }[];
  categories: { slug: string; name: string; nameEn: string }[];
  products: { slug: string; name: string; nameEn: string; creator: string; categorySlug: string; core: string[] }[];
};

const inText = (t: string, words: string[]) => words.some((w) => w === t || w.startsWith(t) || (t.length >= 3 && w.includes(t)));

export function matchCreators(ix: SearchIndex, q: string) {
  const tokens = tokenize(q);
  if (!tokens.length) return [];
  const syn = synonymCategorySlugs(tokens, ix.categories);
  return ix.creators.filter((c) =>
    tokens.every((t) => tokenInWords(t, c.core) || inText(t, c.bio) || [...(syn.get(t) ?? [])].some((slug) => ix.products.some((p) => p.categorySlug === slug && p.creator === c.name))),
  );
}

export function suggest(ix: SearchIndex, q: string, locale: "fr" | "en") {
  const tokens = tokenize(q);
  if (q.trim().length < 2 || !tokens.length) return { artists: [], categories: [], products: [] };
  const syn = synonymCategorySlugs(tokens, ix.categories);
  const artists = matchCreators(ix, q).slice(0, 3).map((c) => ({ slug: c.slug, name: c.name, image: c.image, label: locale === "fr" ? c.specialty : c.specialtyEn }));
  const categories = ix.categories
    .filter((c) => tokens.every((t) => tokenInWords(t, tokenize(`${c.name} ${c.nameEn}`)) || syn.get(t)?.has(c.slug)))
    .slice(0, 2)
    .map((c) => ({ slug: c.slug, label: locale === "fr" ? c.name : c.nameEn }));
  const products = ix.products
    .filter((p) => tokens.every((t) => tokenInWords(t, p.core) || syn.get(t)?.has(p.categorySlug)))
    .slice(0, 4)
    .map((p) => ({ slug: p.slug, name: locale === "fr" ? p.name : p.nameEn, creator: p.creator }));
  return { artists, categories, products };
}

// « Vouliez-vous dire » : artiste ou rubrique dont les mots sont les plus proches de la requête (≤ 2 fautes par mot).
export function didYouMean(ix: SearchIndex, q: string, locale: "fr" | "en") {
  const tokens = tokenize(q).filter((t) => t.length >= 3);
  if (!tokens.length) return null;
  const score = (label: string) => {
    const words = tokenize(label);
    let sum = 0;
    for (const t of tokens) {
      const best = Math.min(...words.filter((w) => Math.abs(w.length - t.length) <= 2).map((w) => closeness(t, w)), Infinity);
      if (best > (t.length <= 5 ? 1 : 2) || best >= t.length / 2) return Infinity;
      sum += best;
    }
    return sum;
  };
  let best: { kind: "artist" | "category"; slug: string; label: string; s: number } | null = null;
  const consider = (kind: "artist" | "category", slug: string, label: string, alt = "") => {
    const s = Math.min(score(label), alt ? score(alt) : Infinity);
    if (s < Infinity && (!best || s < best.s)) best = { kind, slug, label, s };
  };
  for (const c of ix.creators) consider("artist", c.slug, c.name);
  for (const c of ix.categories) consider("category", c.slug, locale === "fr" ? c.name : c.nameEn, locale === "fr" ? c.nameEn : c.name);
  return best as { kind: "artist" | "category"; slug: string; label: string } | null;
}

export { normalize };
