export type TilaProduct = {
  slug: string;
  name: string;
  creatorName: string;
  priceCents: number;
  material: string | null;
  sizes: string[];
  categorySlug: string;
  image: string | null;
  stock: number;
};

export type SearchParams = { q?: string; category?: string; size?: string; min?: number; max?: number };

export type ToolDeps = {
  search: (p: SearchParams) => Promise<TilaProduct[]>;
  get: (slug: string) => Promise<TilaProduct | null>;
};

export const TOOL_DEFS = [
  {
    name: "rechercher_creations",
    description: "Recherche des créations réelles du catalogue (en stock). Tous les filtres sont facultatifs.",
    parameters: {
      type: "object",
      properties: {
        texte: { type: "string", description: "Mots-clés (tenue, robe, bijou, occasion…)" },
        matiere: { type: "string", description: "Matière ou tissu (wax, bogolan, cuir…)" },
        categorie: { type: "string", description: "Slug de catégorie si connu" },
        taille: { type: "string", description: "Taille (S, M, L…)" },
        prix_min_eur: { type: "number" },
        prix_max_eur: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "fiche_creation",
    description: "Détail d'une création à partir de son slug.",
    parameters: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"], additionalProperties: false },
  },
] as const;

const str = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100_000 ? v : undefined);

export const MAX_RESULTS = 6;

/** Entrées du modèle : tout est revalidé, rien d'inconnu n'est transmis à la recherche. */
export function parseSearchArgs(raw: unknown) {
  const a = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    texte: str(a.texte),
    matiere: str(a.matiere),
    categorie: str(a.categorie, 60),
    taille: str(a.taille, 10),
    min: num(a.prix_min_eur),
    max: num(a.prix_max_eur),
  };
}

const view = (p: TilaProduct) => ({
  slug: p.slug,
  nom: p.name,
  createur: p.creatorName,
  prix_eur: Math.round(p.priceCents) / 100,
  matiere: p.material,
  tailles: p.sizes,
});

export async function rechercherCreations(raw: unknown, deps: ToolDeps): Promise<{ products: TilaProduct[]; result: unknown }> {
  const a = parseSearchArgs(raw);
  const base = { size: a.taille, min: a.min, max: a.max };
  const text = [a.texte, a.matiere].filter(Boolean).join(" ") || undefined;
  // Du plus précis au plus large : la recherche texte exige tous les mots.
  const attempts: SearchParams[] = [
    { ...base, q: text, category: a.categorie },
    { ...base, q: text },
    { ...base, q: a.matiere },
    { ...base, q: a.texte },
    { ...base },
  ];
  const seen = new Set<string>();
  for (const params of attempts) {
    const key = JSON.stringify(params);
    if (seen.has(key)) continue;
    seen.add(key);
    const items = (await deps.search(params)).filter((p) => p.stock > 0).slice(0, MAX_RESULTS);
    if (items.length) return { products: items, result: { creations: items.map(view) } };
  }
  return { products: [], result: { creations: [], note: "Aucune création correspondante en stock." } };
}

export async function ficheCreation(raw: unknown, deps: ToolDeps): Promise<{ products: TilaProduct[]; result: unknown }> {
  const slug = str((raw as { slug?: unknown } | null)?.slug, 120);
  const p = slug ? await deps.get(slug) : null;
  if (!p || p.stock <= 0) return { products: [], result: { erreur: "Création introuvable ou indisponible." } };
  return { products: [p], result: { creation: view(p) } };
}

export async function runTool(name: string, args: unknown, deps: ToolDeps) {
  if (name === "rechercher_creations") return rechercherCreations(args, deps);
  if (name === "fiche_creation") return ficheCreation(args, deps);
  return { products: [] as TilaProduct[], result: { erreur: "Outil inconnu." } };
}
