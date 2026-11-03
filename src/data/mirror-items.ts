// Pièces d'essayage au Miroir (voir le composant mirror-try-on).
// kind : où la pièce s'ancre sur le corps ; width : largeur du visuel relative à la largeur du visage (boucles, collier) ou des épaules (haut).
export type MirrorKind = "earrings" | "necklace" | "top" | "jacket" | "belt";

export const MIRROR_ITEMS: Record<string, { kind: MirrorKind }> = {
  "exemple-boucles-anneau-goutte": { kind: "earrings" },
  "exemple-collier-perles-pendentif": { kind: "necklace" },
  "exemple-haut-toile-cuir": { kind: "top" },
  "exemple-veste-longue-tie-dye": { kind: "jacket" },
  "exemple-ceinture-cuir-poches": { kind: "belt" },
};

export const MIRROR_CATEGORIES = ["bijoux", "couture-mode"];
