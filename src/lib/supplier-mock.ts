import type { Locale } from "@/lib/i18n";

// Maquette de l'espace fournisseur : données fictives, aucune écriture en base.
export const tr = (locale: Locale, fr: string, en: string) => (locale === "en" ? en : fr);

export const money = (locale: Locale, amount: number, currency: string) =>
  new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

export const COUNTRIES = ["Cameroun", "Côte d'Ivoire", "Sénégal", "Ghana", "Nigeria", "Bénin", "Congo (RDC)", "France", "Brésil", "Autre"];
export const CURRENCIES = ["XAF", "XOF", "GHS", "NGN", "EUR", "BRL", "USD"];

export type MockArtwork = {
  id: string;
  title: { fr: string; en: string };
  type: { fr: string; en: string };
  price: number;
  currency: string;
  size: string;
  stock: number | "unique";
  status: "published" | "draft" | "review";
  tone: string;
};

export const ARTWORKS: MockArtwork[] = [
  { id: "a1", title: { fr: "Marché de Mokolo", en: "Mokolo Market" }, type: { fr: "Peinture", en: "Painting" }, price: 450000, currency: "XAF", size: "80 × 60 cm", stock: "unique", status: "published", tone: "from-amber-200 to-orange-300" },
  { id: "a2", title: { fr: "Veste Ndop indigo", en: "Indigo Ndop jacket" }, type: { fr: "Couture et mode", en: "Fashion" }, price: 120000, currency: "XAF", size: "M / L", stock: 6, status: "published", tone: "from-indigo-200 to-blue-400" },
  { id: "a3", title: { fr: "Visage de mère", en: "Mother's face" }, type: { fr: "Sculpture", en: "Sculpture" }, price: 780000, currency: "XAF", size: "45 × 20 × 20 cm", stock: "unique", status: "review", tone: "from-stone-300 to-amber-700" },
  { id: "a4", title: { fr: "Étude en rouge", en: "Study in red" }, type: { fr: "Photographie", en: "Photography" }, price: 85000, currency: "XAF", size: "50 × 70 cm", stock: 12, status: "draft", tone: "from-rose-200 to-red-400" },
];

export type MockOrder = {
  id: string;
  date: string;
  buyer: string;
  country: string;
  item: { fr: string; en: string };
  total: number;
  currency: string;
  status: "new" | "preparing" | "shipped" | "delivered";
  tracking?: string;
};

export const ORDERS: MockOrder[] = [
  { id: "EP-1042", date: "2026-11-03", buyer: "Cliente démo A.", country: "France", item: ARTWORKS[0].title, total: 450000, currency: "XAF", status: "new" },
  { id: "EP-1038", date: "2026-10-30", buyer: "Client démo B.", country: "Belgique", item: ARTWORKS[1].title, total: 240000, currency: "XAF", status: "preparing" },
  { id: "EP-1031", date: "2026-10-22", buyer: "Cliente démo C.", country: "Cameroun", item: ARTWORKS[3].title, total: 85000, currency: "XAF", status: "shipped", tracking: "DEMO-TRK-0001" },
  { id: "EP-1019", date: "2026-10-09", buyer: "Client démo D.", country: "Canada", item: ARTWORKS[1].title, total: 120000, currency: "XAF", status: "delivered", tracking: "DEMO-TRK-0002" },
];

export const STATUS_LABEL: Record<MockOrder["status"], { fr: string; en: string; cls: string }> = {
  new: { fr: "Nouvelle", en: "New", cls: "bg-accent/30 text-foreground" },
  preparing: { fr: "En préparation", en: "Preparing", cls: "bg-secondary/20 text-foreground" },
  shipped: { fr: "Expédiée", en: "Shipped", cls: "bg-primary/10 text-primary" },
  delivered: { fr: "Livrée", en: "Delivered", cls: "bg-green-100 text-green-900" },
};

export const ARTWORK_STATUS: Record<MockArtwork["status"], { fr: string; en: string; cls: string }> = {
  published: { fr: "Publiée", en: "Published", cls: "bg-green-100 text-green-900" },
  review: { fr: "En relecture", en: "In review", cls: "bg-accent/30 text-foreground" },
  draft: { fr: "Brouillon", en: "Draft", cls: "bg-muted text-muted-foreground" },
};

export const COMMISSION_RATE = 0.15;

export const PAYOUTS = [
  { id: "V-2026-10", date: "2026-11-05", amount: 255000, status: { fr: "Prévu", en: "Scheduled" } },
  { id: "V-2026-09", date: "2026-10-05", amount: 612000, status: { fr: "Versé", en: "Paid" } },
  { id: "V-2026-08", date: "2026-09-05", amount: 340000, status: { fr: "Versé", en: "Paid" } },
];
