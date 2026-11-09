import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

const PAGES: Record<string, { fr: string[]; en: string[] }> = {
  faq: {
    fr: [
      "Comment acheter ?       Choisissez une création, ajoutez-la au panier, puis passez commande en quelques clics.",
            "Les créations sont-elles uniques ? Oui, chaque création d'artiste est une pièce unique .",
      "Dans quelle devise paie-t-on ? Toujours en EUR ; les autres devises sont une conversion indicative.",
    ],
    en: [
      "How do I buy?       Pick a creation, add it to the cart, then place your order in a few clicks.",
            "Are the creations unique? Yes, each artist's creation is a one-of-a-kind piece.",
      "Which currency do I pay in? Always EUR; other currencies are an indicative conversion.",
    ],
  },
  terms: {
    fr: ["Conditions générales de vente : toute commande passée sur E póm ta’ est soumise aux présentes conditions. Pour toute question, contactez-nous."],
    en: ["Terms and conditions of sale: every order placed on E póm ta’ is subject to these conditions. For any question, contact us."],
  },
  privacy: {
    fr: [
      "Données collectées : nom, adresse e-mail et mot de passe (stocké chiffré, jamais en clair) à la création d'un compte ; adresses de livraison, commandes, favoris et préférences d'alertes ; abonnement de notification push si vous l'activez. Connexion Google (facultative) : nous recevons uniquement votre nom et votre e-mail.",
      "Finalités : gérer votre compte et vos commandes, vous envoyer les e-mails et notifications que vous avez choisis (baisse de prix, indisponibilité d'un favori, panier laissé), faire fonctionner le site. Aucune publicité, aucune revente de données, aucun suivi publicitaire.",
      "Caméra (Miroir) et photos : l'image est traitée sur votre appareil et n'est pas envoyée à nos serveurs. Langue et région sont mémorisées dans un cookie ou sur votre appareil.",
      "Prestataires techniques : Vercel (hébergement), Neon (base de données, Francfort), Google (connexion), service d'envoi d'e-mails, flagcdn.com (drapeaux) et Photon/Komoot (suggestions d'adresses). Les notifications push passent par les services Apple/Google/navigateur.",
      "Vos droits (accès, rectification, suppression, retrait du consentement) : écrivez-nous via la page Contact ; la suppression du compte efface vos données personnelles.",
    ],
    en: [
      "Data we collect: name, email address and password (stored hashed, never in clear text) when you create an account; delivery addresses, orders, favourites and alert preferences; a push-notification subscription if you enable it. Google sign-in (optional): we only receive your name and email.",
      "Purposes: running your account and orders, sending the emails and notifications you chose (price drop, favourite unavailable, abandoned cart), operating the site. No advertising, no resale of data, no ad tracking.",
      "Camera (Mirror) and photos: the image is processed on your device and is not sent to our servers. Language and region are stored in a cookie or on your device.",
      "Technical providers: Vercel (hosting), Neon (database, Frankfurt), Google (sign-in), an email-sending service, flagcdn.com (flags) and Photon/Komoot (address suggestions). Push notifications go through Apple/Google/browser services.",
      "Your rights (access, correction, deletion, withdrawing consent): write to us via the Contact page; deleting your account erases your personal data.",
    ],
  },
  contact: {
    fr: ["Contact : écrivez-nous par e-mail, nous vous répondons dès que possible."],
    en: ["Contact: write to us by email, we reply as soon as possible."],
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
      {body.map((p) => (
        <p key={p} className="text-sm leading-relaxed">
          {p}
        </p>
      ))}
    </div>
  );
}
