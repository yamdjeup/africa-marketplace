// Pièces essayables au Miroir (voir le composant mirror-try-on).
// kind : où la pièce s'ancre sur le corps. Les bijoux (earrings, necklace) sont prêts pour de vraies pièces à venir.
export type MirrorKind = "earrings" | "necklace" | "top" | "jacket" | "belt";

export const MIRROR_ITEMS: Record<string, { kind: MirrorKind }> = {
  "exemple-imane-ayissi-veste-tie-dye": { kind: "jacket" },
  "exemple-lozama-akara-belt": { kind: "belt" },
  "exemple-lozama-neitha-harness": { kind: "top" },
};

export const MIRROR_CATEGORIES = ["bijoux", "couture-mode"];
