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
    fr: [
      "Données collectées : nom, adresse e-mail et mot de passe (stocké chiffré, jamais en clair) à la création d'un compte ; adresses de livraison, commandes simulées, favoris et préférences d'alertes ; abonnement de notification push si vous l'activez. Connexion Google (facultative) : nous recevons uniquement votre nom et votre e-mail.",
      "Finalités : gérer votre compte et vos commandes, vous envoyer les e-mails et notifications que vous avez choisis (baisse de prix, indisponibilité d'un favori, panier laissé), faire fonctionner le site. Aucune publicité, aucune revente de données, aucun suivi publicitaire.",
      "Caméra (Miroir) et photos : l'image est traitée sur votre appareil et n'est pas envoyée à nos serveurs. Langue et région sont mémorisées dans un cookie ou sur votre appareil.",
      "Prestataires techniques : Vercel (hébergement), Neon (base de données, Francfort), Google (connexion), service d'envoi d'e-mails, flagcdn.com (drapeaux) et Photon/Komoot (suggestions d'adresses). Les notifications push passent par les services Apple/Google/navigateur.",
      "Vos droits (accès, rectification, suppression, retrait du consentement) : écrivez-nous via la page Contact ; la suppression du compte efface vos données personnelles. Responsable de traitement et coordonnées définitives : à compléter avant la mise en ligne publique.",
    ],
    en: [
      "Data we collect: name, email address and password (stored hashed, never in clear text) when you create an account; delivery addresses, simulated orders, favourites and alert preferences; a push-notification subscription if you enable it. Google sign-in (optional): we only receive your name and email.",
      "Purposes: running your account and orders, sending the emails and notifications you chose (price drop, favourite unavailable, abandoned cart), operating the site. No advertising, no resale of data, no ad tracking.",
      "Camera (Mirror) and photos: the image is processed on your device and is not sent to our servers. Language and region are stored in a cookie or on your device.",
      "Technical providers: Vercel (hosting), Neon (database, Frankfurt), Google (sign-in), an email-sending service, flagcdn.com (flags) and Photon/Komoot (address suggestions). Push notifications go through Apple/Google/browser services.",
      "Your rights (access, correction, deletion, withdrawing consent): write to us via the Contact page; deleting your account erases your personal data. Data controller and final contact details: to be completed before public launch.",
    ],
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
