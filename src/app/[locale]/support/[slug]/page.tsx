import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

const PAGES: Record<string, { fr: string[]; en: string[] }> = {
  faq: {
    fr: [
      "Comment acheter ? Choisissez une cr?ation, ajoutez-la au panier, puis passez commande en quelques clics. Un e-mail de confirmation vous est envoy? imm?diatement.",
      "Les cr?ations sont-elles uniques ? Oui, chaque cr?ation d'artiste est une pi?ce unique.",
      "Comment suivre ma commande ? Depuis votre compte, rubrique Mes commandes, ou via le lien de suivi re?u par e-mail d?s l'exp?dition.",
      "Quels sont les d?lais de livraison ? Chaque cr?ateur pr?pare et exp?die sa commande ; le transporteur et le num?ro de suivi vous sont indiqu?s dans l'e-mail d'exp?dition.",
      "Puis-je modifier mon adresse de livraison ? Oui, tant que la commande n'est pas exp?di?e, via le lien pr?sent dans l'e-mail de confirmation.",
      "Puis-je retourner un article ? Oui, vous disposez de 30 jours apr?s la livraison pour retourner une cr?ation, dans son ?tat d'origine. Contactez-nous pour organiser le retour.",
      "Quels moyens de paiement sont accept?s ? Le paiement par carte bancaire, s?curis?. Les prix sont toujours en euros (EUR) ; les autres devises sont une conversion indicative.",
      "Comment choisir ma taille ? Chaque fiche produit indique les tailles disponibles et les dimensions. En cas de doute, ?crivez-nous avant de commander.",
      "Qui sont les cr?ateurs ? Des artistes et cr?ateurs afrodescendants ind?pendants. Leur page pr?sente leur parcours et l'ensemble de leurs cr?ations.",
    ],
    en: [
      "How do I buy? Pick a creation, add it to the cart, then place your order in a few clicks. A confirmation email is sent to you right away.",
      "Are the creations unique? Yes, each artist's creation is a one-of-a-kind piece.",
      "How do I track my order? From your account under My orders, or via the tracking link in the email you receive once it ships.",
      "What are the delivery times? Each creator prepares and ships their own order; the carrier and tracking number are given in the shipping email.",
      "Can I change my delivery address? Yes, as long as the order has not shipped, using the link in the confirmation email.",
      "Can I return an item? Yes, you have 30 days after delivery to return a creation in its original condition. Contact us to arrange the return.",
      "Which payment methods are accepted? Secure card payment. Prices are always in euros (EUR); other currencies are an indicative conversion.",
      "How do I choose my size? Each product page lists the available sizes and dimensions. If in doubt, write to us before ordering.",
      "Who are the creators? Independent artists and designers of African descent. Their page presents their story and all their creations.",
    ],
  },
  terms: {
    fr: [
      "1. Objet. Les pr?sentes conditions g?n?rales de vente r?gissent toute commande pass?e sur E p?m ta?, galerie en ligne de cr?ations d'artistes et de cr?ateurs afrodescendants.",
      "2. Commandes. Toute commande vaut acceptation des pr?sentes conditions. Un e-mail de confirmation est envoy? apr?s validation. Chaque cr?ation ?tant une pi?ce unique, sa disponibilit? est confirm?e par le cr?ateur.",
      "3. Prix. Les prix sont indiqu?s en euros (?), toutes taxes comprises. E p?m ta? peut modifier ses prix ? tout moment ; le prix applicable est celui affich? au moment de la commande.",
      "4. Paiement. Le paiement s'effectue par carte bancaire au moment de la commande. Il est s?curis? et la commande n'est trait?e qu'apr?s enregistrement du paiement.",
      "5. Livraison. Chaque cr?ateur exp?die sa commande ? l'adresse indiqu?e. Le transporteur et le num?ro de suivi sont communiqu?s par e-mail. L'adresse reste modifiable tant que la commande n'est pas exp?di?e.",
      "6. Retours. Vous pouvez retourner un article sous 30 jours ? compter de sa livraison, dans son ?tat d'origine. Contactez-nous pour organiser le retour ; l'article retourn? est rembours? apr?s r?ception.",
      "7. Droit de r?tractation. Conform?ment au Code de la consommation, vous disposez de 14 jours ? compter de la r?ception pour vous r?tracter sans avoir ? justifier de motif, sauf pour les cr?ations personnalis?es ? votre demande.",
      "8. Responsabilit?. E p?m ta? agit comme interm?diaire entre les acheteurs et les cr?ateurs. Notre responsabilit? ne saurait ?tre engag?e en cas de retard ou d'indisponibilit? du transporteur ou de force majeure.",
      "9. Droit applicable. Les pr?sentes conditions sont soumises au droit fran?ais. En cas de litige, une solution amiable sera recherch?e avant toute action, ? d?faut de quoi les tribunaux comp?tents seront saisis.",
      "Pour toute question, contactez-nous via la page Contact.",
    ],
    en: [
      "1. Purpose. These terms and conditions of sale govern every order placed on E p?m ta?, an online gallery of creations by artists and designers of African descent.",
      "2. Orders. Placing an order means accepting these terms. A confirmation email is sent once the order is validated. As each creation is a one-of-a-kind piece, its availability is confirmed by the creator.",
      "3. Prices. Prices are shown in euros (?), all taxes included. E p?m ta? may change its prices at any time; the price that applies is the one displayed when you order.",
      "4. Payment. Payment is made by card when you order. It is secure and the order is processed only once payment has been recorded.",
      "5. Delivery. Each creator ships their own order to the address provided. The carrier and tracking number are sent by email. The address can be changed as long as the order has not shipped.",
      "6. Returns. You may return an item within 30 days of delivery, in its original condition. Contact us to arrange the return; the returned item is refunded once received.",
      "7. Right of withdrawal. In accordance with consumer law, you have 14 days from receipt to withdraw without giving a reason, except for creations made to your personal specifications.",
      "8. Liability. E p?m ta? acts as an intermediary between buyers and creators. We cannot be held liable for carrier delays or unavailability, or force majeure.",
      "9. Governing law. These terms are governed by French law. In the event of a dispute, an amicable solution will be sought first, failing which the competent courts will have jurisdiction.",
      "For any question, contact us via the Contact page.",
    ],
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
    fr: [
      "Une question sur une cr?ation, une commande ou votre compte ? ?crivez-nous par e-mail ? contact@epomta.example.",
      "D?lai de r?ponse : nous r?pondons sous 48 heures ouvr?es.",
      "Pour traiter votre demande plus vite, indiquez : votre num?ro de commande (ex. EP-20481), l'adresse e-mail utilis?e pour commander, le nom de la cr?ation concern?e et, le cas ?ch?ant, une photo.",
      "Pour un retour ou un changement d'adresse, pr?cisez-le dans l'objet de votre message.",
    ],
    en: [
      "A question about a creation, an order or your account? Email us at contact@epomta.example.",
      "Response time: we reply within 48 business hours.",
      "To help us handle your request faster, include: your order number (e.g. EP-20481), the email address used to order, the name of the creation concerned and, if relevant, a photo.",
      "For a return or an address change, mention it in the subject of your message.",
    ],
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
