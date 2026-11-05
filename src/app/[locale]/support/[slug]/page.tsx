import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

// Contenu provisoire de démonstration (à remplacer avant toute mise en ligne publique).
const PAGES: Record<string, { fr: string[]; en: string[] }> = {
  faq: {
    fr: [
      "Comment acheter ? Choisissez une œuvre, ajoutez-la au panier, puis passez la commande simulée : aucun paiement réel n'est effectué.",
      "Les œuvres sont-elles uniques ? Oui, chaque œuvre d'artiste est une pièce unique ; les pièces « Exemple » sont fictives.",
      "Dans quelle devise paie-t-on ? Toujours en EUR ; les autres devises sont une conversion indicative.",
    ],
    en: [
      "How do I buy? Pick an artwork, add it to the cart, then place the simulated order: no real payment is made.",
      "Are the works unique? Yes, each artist's work is a one-of-a-kind piece; “Example” items are fictional.",
      "Which currency do I pay in? Always EUR; other currencies are an indicative conversion.",
    ],
  },
  terms: {
    fr: ["Conditions générales de vente : texte à rédiger. Cette démonstration privée ne constitue pas une offre de vente."],
    en: ["Terms and conditions of sale: text to be written. This private demo is not an offer for sale."],
  },
  privacy: {
    fr: ["Politique de confidentialité : texte à rédiger. La démonstration ne conserve que les données nécessaires aux comptes et commandes simulées."],
    en: ["Privacy policy: text to be written. The demo only keeps the data needed for accounts and simulated orders."],
  },
  contact: {
    fr: ["Contact : coordonnées à renseigner. Pour la démonstration, adressez vos questions à la personne qui vous a communiqué l'accès."],
    en: ["Contact: details to be provided. For the demo, please send your questions to the person who gave you access."],
  },
};

const KEYS = ["faq", "terms", "privacy", "contact", "about", "discounts", "doNotSell", "credits"] as const;
type Key = (typeof KEYS)[number];
const keyOf = (slug: string) => {
  const s = slug === "do-not-sell" ? "doNotSell" : slug;
  return (KEYS as readonly string[]).includes(s) ? (s as Key) : null;
};

function labelOf(locale: Locale, key: Key) {
  const d = getDict(locale);
  return key in d.me ? d.me[key as keyof typeof d.me] as string : key === "credits" ? d.f10.credits : d.f10[key as "about" | "discounts" | "doNotSell"];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const key = keyOf(slug);
  return { title: key ? labelOf(locale, key) : undefined, robots: { index: false } };
}

export default async function SupportPage({ params }: Props) {
  const { locale, slug } = await params;
  const key = keyOf(slug);
  if (!key) notFound();
  const t = getDict(locale).me;
  const body = key in PAGES ? PAGES[key][locale === "en" ? "en" : "fr"] : [getDict(locale).f10.pages[key as "about" | "discounts" | "doNotSell" | "credits"]];
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href={`/${locale}/account`} className="text-sm text-muted-foreground hover:text-terracotta">
        ‹ {t.back}
      </Link>
      <h1 className="font-heading text-3xl text-primary">{labelOf(locale, key)}</h1>
      <p className="rounded-md bg-accent/20 px-3 py-2 text-xs">{t.provisional}</p>
      {body.map((p) => (
        <p key={p} className="text-sm leading-relaxed">
          {p}
        </p>
      ))}
    </div>
  );
}
