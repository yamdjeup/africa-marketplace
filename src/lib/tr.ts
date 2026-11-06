import type { Locale } from "@/lib/i18n";

export const tr = (locale: Locale, fr: string, en: string) => (locale === "en" ? en : fr);

export const COUNTRIES = ["Cameroun", "Côte d'Ivoire", "Sénégal", "Ghana", "Nigeria", "Bénin", "Congo (RDC)", "France", "Brésil", "Autre"];
export const CRAFTS = ["Peinture", "Sculpture", "Photographie", "Couture et mode", "Textile", "Accessoires"];
