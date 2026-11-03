// Pièces d'essayage au Miroir (voir le composant mirror-try-on).
// kind : où la pièce s'ancre sur le corps ; width : largeur du visuel relative à la largeur du visage (boucles, collier) ou des épaules (haut).
export type MirrorKind = "earrings" | "necklace" | "top";

export const MIRROR_ITEMS: Record<string, { kind: MirrorKind }> = {
  "exemple-boucles-anneau-goutte": { kind: "earrings" },
  "exemple-collier-perles-pendentif": { kind: "necklace" },
  "exemple-haut-bandes-kente": { kind: "top" },
};

export const MIRROR_CATEGORIES = ["bijoux", "couture-mode"];
