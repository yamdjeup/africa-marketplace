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
      "1. Qui sommes-nous. E p?m ta? est une galerie en ligne de cr?ations d'artistes et de cr?ateurs afrodescendants. Nous sommes responsable du traitement de vos donn?es personnelles. Contact : contact@epomta.example.",
      "2. Donn?es collect?es. Compte : nom, adresse e-mail, mot de passe (stock? chiffr?, jamais en clair), connexion Google facultative (nom et e-mail uniquement). Commandes et livraison : articles, adresse, t?l?phone, historique. Paiement : r?gl? par carte aupr?s de notre prestataire, nous ne conservons pas vos donn?es de carte. Navigation : langue, r?gion, favoris, pr?f?rences d'alertes, abonnement de notification push si vous l'activez.",
      "3. Finalit?s et bases l?gales. Ex?cution du contrat : g?rer votre compte, traiter et livrer vos commandes. Consentement : notifications push et alertes (baisse de prix, favori indisponible, panier laiss?), que vous pouvez retirer ? tout moment. Int?r?t l?gitime : s?curit? et bon fonctionnement du site. Obligation l?gale : conservation des documents comptables. Aucune publicit?, aucune revente de donn?es.",
      "4. Partage des donn?es. Nous partageons uniquement le n?cessaire : le cr?ateur concern? et le transporteur re?oivent votre nom, adresse et t?l?phone pour exp?dier la commande ; le prestataire de paiement traite votre r?glement ; nos prestataires techniques assurent l'h?bergement (Vercel), la base de donn?es (Neon, Francfort), l'envoi d'e-mails, la connexion Google et les suggestions d'adresses (Photon/Komoot).",
      "5. Transferts internationaux. Les cr?ateurs et transporteurs pouvant ?tre situ?s en Afrique ou en Europe, vos donn?es de livraison peuvent ?tre transmises hors de l'Union europ?enne, uniquement pour l'exp?dition de votre commande et avec des garanties appropri?es.",
      "6. Dur?e de conservation. Donn?es de compte : jusqu'? la suppression du compte. Commandes et factures : 10 ans (obligation comptable). Donn?es de navigation et d'alertes : tant que le compte est actif, puis supprim?es.",
      "7. Vos droits. Vous disposez des droits d'acc?s, de rectification, d'effacement, d'opposition, de limitation et de portabilit?, ainsi que du droit de retirer votre consentement. Pour les exercer, ?crivez-nous ? contact@epomta.example ; la suppression du compte efface vos donn?es personnelles. Vous pouvez aussi saisir la CNIL.",
      "8. Cookies. Nous utilisons uniquement des cookies et stockages n?cessaires au fonctionnement du site (langue, r?gion, session, panier). Aucun cookie publicitaire ni de suivi. La cam?ra (Miroir) et les photos sont trait?es sur votre appareil et ne sont pas envoy?es ? nos serveurs.",
      "9. S?curit?. Connexions chiffr?es (HTTPS), mots de passe chiffr?s, acc?s restreints aux donn?es. Aucune mesure n'offrant une s?curit? absolue, nous vous invitons ? prot?ger vos identifiants.",
      "10. Mineurs. Le site s'adresse aux personnes majeures. Nous ne collectons pas sciemment de donn?es concernant des mineurs de moins de 15 ans.",
      "11. Modifications. Cette politique peut ?voluer ; la version en vigueur est celle publi?e sur cette page. Derni?re mise ? jour : novembre 2026.",
    ],
    en: [
      "1. Who we are. E p?m ta? is an online gallery of creations by artists and designers of African descent. We are the controller of your personal data. Contact: contact@epomta.example.",
      "2. Data we collect. Account: name, email, password (stored hashed, never in clear text), optional Google sign-in (name and email only). Orders and delivery: items, address, phone, history. Payment: made by card with our payment provider; we do not store your card data. Browsing: language, region, favourites, alert preferences, a push-notification subscription if you enable it.",
      "3. Purposes and legal bases. Contract: managing your account, processing and delivering your orders. Consent: push notifications and alerts (price drop, favourite unavailable, abandoned cart), which you can withdraw at any time. Legitimate interest: site security and operation. Legal obligation: keeping accounting records. No advertising, no resale of data.",
      "4. Data sharing. We share only what is necessary: the creator concerned and the carrier receive your name, address and phone to ship the order; the payment provider processes your payment; our technical providers handle hosting (Vercel), the database (Neon, Frankfurt), email sending, Google sign-in and address suggestions (Photon/Komoot).",
      "5. International transfers. As creators and carriers may be located in Africa or Europe, your delivery data may be sent outside the European Union, only to ship your order and with appropriate safeguards.",
      "6. Retention. Account data: until you delete your account. Orders and invoices: 10 years (accounting obligation). Browsing and alert data: while your account is active, then deleted.",
      "7. Your rights. You have the rights of access, rectification, erasure, objection, restriction and portability, and the right to withdraw consent. To exercise them, write to contact@epomta.example; deleting your account erases your personal data. You may also lodge a complaint with your data protection authority.",
      "8. Cookies. We only use cookies and storage necessary for the site to work (language, region, session, cart). No advertising or tracking cookies. The camera (Mirror) and photos are processed on your device and are not sent to our servers.",
      "9. Security. Encrypted connections (HTTPS), hashed passwords, restricted access to data. As no measure offers absolute security, please protect your credentials.",
      "10. Minors. The site is intended for adults. We do not knowingly collect data from minors under 15.",
      "11. Changes. This policy may change; the version in force is the one published on this page. Last updated: November 2026.",
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
