// Recherche tolérante (sans dépendance) : normalisation, proximité phonétique simple, distance de Damerau-Levenshtein.
export const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const tokenize = (s: string): string[] => normalize(s).split(/[^a-z0-9]+/).filter(Boolean);

// Clé phonétique grossière (k/c/q, ph/f, ou/u, y/i, gh/g, lettres doubles) pour les orthographes variables.
export function phonetic(w: string): string {
  return normalize(w)
    .replace(/ph/g, "f")
    .replace(/gh/g, "g")
    .replace(/c(?=[ei])/g, "s")
    .replace(/ck|c|q/g, "k")
    .replace(/ou/g, "u")
    .replace(/w/g, "u")
    .replace(/y/g, "i")
    .replace(/(.)\1+/g, "$1");
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (!la || !lb) return Math.max(la, lb);
  const d: number[][] = Array.from({ length: la + 1 }, (_, i) => [i, ...Array(lb).fill(0)]);
  for (let j = 0; j <= lb; j++) d[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[la][lb];
}

const maxDist = (len: number) => (len <= 2 ? 0 : len <= 5 ? 1 : 2);

// Le mot de la requête (déjà normalisé) correspond-il au mot indexé ?
export function wordMatches(t: string, w: string): boolean {
  if (w === t) return true;
  if (t.length >= 2 && w.startsWith(t)) return true;
  if (t.length >= 3 && w.includes(t)) return true;
  if (t.length < 3) return false;
  const pt = phonetic(t);
  const pw = phonetic(w);
  if (pt === pw || (pt.length >= 3 && pw.startsWith(pt))) return true;
  if (Math.abs(pt.length - pw.length) <= 2 && editDistance(pt, pw) <= maxDist(pt.length)) return true;
  return Math.abs(t.length - w.length) <= 2 && editDistance(t, w) <= maxDist(t.length);
}

export const tokenInWords = (t: string, words: string[]) => words.some((w) => wordMatches(t, w));

// Distance relative d'un mot de la requête au mot le plus proche (pour « Vouliez-vous dire »).
export function closeness(t: string, w: string): number {
  return Math.min(editDistance(t, w), editDistance(phonetic(t), phonetic(w)));
}

// Synonymes FR/EN → rubrique : motif sur le nom (normalisé) de la catégorie réelle.
export const SYNONYMS: { words: string[]; category: RegExp }[] = [
  { words: ["tableau", "tableaux", "toile", "toiles", "painting", "paintings", "canvas", "peindre", "huile", "acrylique", "oil"], category: /peintur|paint/ },
  { words: ["statue", "statues", "statuette", "bronze", "sculpt", "sculpteur", "sculptor", "carving"], category: /sculpt/ },
  { words: ["robe", "robes", "dress", "tenue", "tenues", "outfit", "couture", "couturier", "mode", "fashion", "vetement", "vetements", "clothing", "veste", "jacket", "pagne", "boubou", "wax"], category: /couture|mode|fashion/ },
  { words: ["photo", "photos", "photograph", "photographe", "photographer", "cliche", "picture", "pictures"], category: /photo/ },
  { words: ["bijou", "bijoux", "jewel", "jewelry", "jewellery", "collier", "necklace", "bracelet", "bague", "ring", "sac", "bag", "accessoire", "accessory", "accessories"], category: /accessoire|accessor/ },
  { words: ["textile", "textiles", "tissu", "tissus", "fabric", "decoration", "deco", "maison", "home", "coussin", "cushion", "tapisserie", "tapestry"], category: /textile|decor/ },
];

export function synonymCategorySlugs(tokens: string[], cats: { slug: string; name: string; nameEn: string }[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const t of tokens) {
    for (const s of SYNONYMS) {
      if (!s.words.some((w) => w === t || (t.length >= 4 && w.startsWith(t)) || (t.length >= 4 && wordMatches(t, w) && editDistance(t, w) <= 1))) continue;
      for (const c of cats) {
        if (s.category.test(normalize(`${c.name} ${c.nameEn}`))) {
          const set = out.get(t) ?? new Set<string>();
          set.add(c.slug);
          out.set(t, set);
        }
      }
    }
  }
  return out;
}
