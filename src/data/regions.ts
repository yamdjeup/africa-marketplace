export type Region = { code: string; flag: string; fr: string; en: string; currency: string; rate: number };

// Taux statiques INDICATIFS (1 EUR = rate unités de la devise). À réviser à la main ; jamais utilisés pour le paiement.
export const REGIONS: Region[] = [
  { code: "FR", flag: "🇫🇷", fr: "France", en: "France", currency: "EUR", rate: 1 },
  { code: "DZ", flag: "🇩🇿", fr: "Algérie", en: "Algeria", currency: "DZD", rate: 150 },
  { code: "BJ", flag: "🇧🇯", fr: "Bénin", en: "Benin", currency: "XOF", rate: 655.957 },
  { code: "CM", flag: "🇨🇲", fr: "Cameroun", en: "Cameroon", currency: "XAF", rate: 655.957 },
  { code: "CI", flag: "🇨🇮", fr: "Côte d'Ivoire", en: "Ivory Coast", currency: "XOF", rate: 655.957 },
  { code: "EG", flag: "🇪🇬", fr: "Égypte", en: "Egypt", currency: "EGP", rate: 55 },
  { code: "ET", flag: "🇪🇹", fr: "Éthiopie", en: "Ethiopia", currency: "ETB", rate: 140 },
  { code: "GH", flag: "🇬🇭", fr: "Ghana", en: "Ghana", currency: "GHS", rate: 13 },
  { code: "KE", flag: "🇰🇪", fr: "Kenya", en: "Kenya", currency: "KES", rate: 140 },
  { code: "MG", flag: "🇲🇬", fr: "Madagascar", en: "Madagascar", currency: "MGA", rate: 4900 },
  { code: "MA", flag: "🇲🇦", fr: "Maroc", en: "Morocco", currency: "MAD", rate: 10.8 },
  { code: "MU", flag: "🇲🇺", fr: "Maurice", en: "Mauritius", currency: "MUR", rate: 50 },
  { code: "NG", flag: "🇳🇬", fr: "Nigeria", en: "Nigeria", currency: "NGN", rate: 1700 },
  { code: "CD", flag: "🇨🇩", fr: "RD Congo", en: "DR Congo", currency: "CDF", rate: 3100 },
  { code: "RW", flag: "🇷🇼", fr: "Rwanda", en: "Rwanda", currency: "RWF", rate: 1500 },
  { code: "SN", flag: "🇸🇳", fr: "Sénégal", en: "Senegal", currency: "XOF", rate: 655.957 },
  { code: "TN", flag: "🇹🇳", fr: "Tunisie", en: "Tunisia", currency: "TND", rate: 3.4 },
  { code: "ZA", flag: "🇿🇦", fr: "Afrique du Sud", en: "South Africa", currency: "ZAR", rate: 20 },
];

export const DEFAULT_REGION = "FR";
