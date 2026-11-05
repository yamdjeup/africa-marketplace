// Regroupement des catégories pour les onglets Tout / Art / Mode de la Boutique mobile.
export type ShopTab = "all" | "art" | "fashion";

const ART = ["peinture", "sculpture", "photographie"];

export const tabOf = (categorySlug: string): Exclude<ShopTab, "all"> => (ART.includes(categorySlug) ? "art" : "fashion");

export const parseTab = (v: string | undefined): ShopTab => (v === "art" || v === "fashion" ? v : "all");
