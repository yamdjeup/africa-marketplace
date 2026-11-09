import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, type Locale } from "@/lib/i18n";
import { HelpFeedback } from "@/components/marketplace/help-feedback";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

const PAGES: Record<string, { fr: string[]; en: string[] }> = {
  faq: {
    fr: [
      "Comment acheter ? Choisissez une création, ajoutez-la au panier, puis passez commande en quelques clics. Un e-mail de confirmation vous est envoyé immédiatement.",
      "Les créations sont-elles uniques ? Oui, chaque création d'artiste est une pièce unique.",
      "Comment suivre ma commande ? Depuis votre compte, rubrique Mes commandes, ou via le lien de suivi reçu par e-mail dès l'expédition. Voir Commandes et livraison.",
      "Puis-je modifier mon adresse de livraison ? Oui, tant que la commande n'est pas expédiée, via le lien présent dans l'e-mail de confirmation.",
      "Puis-je annuler ma commande ? Oui, tant qu'elle n'est pas expédiée : écrivez-nous et vous êtes remboursé intégralement.",
      "Puis-je retourner un article ? Oui, sous 30 jours après la livraison, dans son état d'origine. Voir Retours et remboursements.",
      "Quels moyens de paiement sont acceptés ? Le paiement par carte bancaire, sécurisé. Les prix sont en euros (EUR) ; les autres devises sont une conversion indicative. Voir Paiement et tarification.",
      "Comment choisir ma taille ? Chaque fiche produit indique les tailles disponibles et les dimensions. En cas de doute, écrivez-nous avant de commander.",
      "Qui sont les créateurs ? Des artistes et créateurs afrodescendants indépendants. Leur page présente leur parcours et l'ensemble de leurs créations.",
      "Comment vous contacter ? Via la page Contact ; nous répondons sous 48 heures ouvrées.",
    ],
    en: [
      "How do I buy? Pick a creation, add it to the cart, then place your order in a few clicks. A confirmation email is sent to you right away.",
      "Are the creations unique? Yes, each artist's creation is a one-of-a-kind piece.",
      "How do I track my order? From your account under My orders, or via the tracking link in the email you receive once it ships. See Orders and delivery.",
      "Can I change my delivery address? Yes, as long as the order has not shipped, using the link in the confirmation email.",
      "Can I cancel my order? Yes, as long as it has not shipped: write to us and you will be refunded in full.",
      "Can I return an item? Yes, within 30 days of delivery, in its original condition. See Returns and refunds.",
      "Which payment methods are accepted? Secure card payment. Prices are in euros (EUR); other currencies are an indicative conversion. See Payment and pricing.",
      "How do I choose my size? Each product page lists the available sizes and dimensions. If in doubt, write to us before ordering.",
      "Who are the creators? Independent artists and designers of African descent. Their page presents their story and all their creations.",
      "How can I contact you? Via the Contact page; we reply within 48 business hours.",
    ],
  },
  orders: {
    fr: [
      "Préparation. Chaque création est préparée et expédiée par l'artiste ou le partenaire qui la propose. La commande est préparée sous 2 jours ouvrés.",
      "Suivi. Dès l'expédition, vous recevez un e-mail indiquant le transporteur et le numéro de suivi. Vous retrouvez aussi vos commandes dans votre compte, rubrique Mes commandes.",
      "Commande de plusieurs partenaires. Si votre panier réunit des créations de plusieurs partenaires, elles peuvent être expédiées séparément et arriver à des dates différentes ; vous recevez un e-mail de suivi par envoi.",
      "Délais et frais. Les délais dépendent du partenaire, du transporteur et du pays de destination. Les éventuels frais de livraison sont affichés avant la validation de la commande.",
      "Livraison. Une signature peut être demandée à la remise du colis. Vérifiez que quelqu'un est disponible à l'adresse indiquée.",
      "Adresse. Vous pouvez modifier l'adresse de livraison tant que la commande n'est pas expédiée, via le lien de l'e-mail de confirmation.",
      "Annulation. Vous pouvez annuler une commande tant qu'elle n'est pas expédiée : écrivez-nous via la page Contact en indiquant votre numéro de commande. Vous êtes alors remboursé intégralement, sous 14 à 21 jours.",
      "Colis non reçu ou endommagé. Contactez-nous avec votre numéro de commande ; nous étudions la situation avec le partenaire et le transporteur.",
    ],
    en: [
      "Preparation. Each creation is prepared and shipped by the artist or partner who offers it. Orders are prepared within 2 business days.",
      "Tracking. Once your order ships, you receive an email with the carrier and tracking number. You can also find your orders in your account under My orders.",
      "Orders from several partners. If your cart contains creations from several partners, they may ship separately and arrive on different dates; you receive one tracking email per shipment.",
      "Times and fees. Delivery times depend on the partner, the carrier and the destination country. Any delivery fees are shown before you confirm your order.",
      "Delivery. A signature may be required on delivery. Make sure someone is available at the address provided.",
      "Address. You can change the delivery address as long as the order has not shipped, using the link in the confirmation email.",
      "Cancellation. You can cancel an order as long as it has not shipped: write to us via the Contact page with your order number. You are then refunded in full, within 14 to 21 days.",
      "Parcel not received or damaged. Contact us with your order number; we look into it with the partner and the carrier.",
    ],
  },
  payment: {
    fr: [
      "Prix. Les prix sont fixés par chaque partenaire, en euros (€), toutes taxes comprises. Le prix applicable est celui affiché au moment de la commande.",
      "Moyen de paiement. Le paiement s'effectue par carte bancaire au moment de la commande ; votre carte est débitée à la validation. Nous ne conservons aucune donnée de carte.",
      "Plusieurs partenaires. Même si votre panier contient des créations de plusieurs partenaires, vous ne réalisez qu'une seule transaction.",
      "Sécurité. Les paiements sont sécurisés et peuvent nécessiter une authentification 3D Secure auprès de votre banque.",
      "Devises. Seul l'euro est débité ; l'affichage dans une autre devise n'est qu'une conversion indicative, et votre banque peut appliquer ses propres frais de change.",
      "Confirmation. Un e-mail de confirmation vous est envoyé une fois le paiement enregistré.",
      "Paiement refusé. Vérifiez les informations de votre carte, contactez votre banque, ou essayez un autre moyen de paiement ; si le problème persiste, écrivez-nous.",
    ],
    en: [
      "Prices. Prices are set by each partner, in euros (€), all taxes included. The price that applies is the one displayed when you order.",
      "Payment method. Payment is made by card when you order; your card is charged on confirmation. We store no card data.",
      "Several partners. Even if your cart contains creations from several partners, you make a single transaction.",
      "Security. Payments are secure and may require 3D Secure authentication with your bank.",
      "Currencies. Only euros are charged; display in another currency is an indicative conversion only, and your bank may apply its own foreign-exchange fees.",
      "Confirmation. A confirmation email is sent once payment has been recorded.",
      "Payment declined. Check your card details, contact your bank or try another payment method; if the problem persists, write to us.",
    ],
  },
  returns: {
    fr: [
      "Délai. Vous pouvez retourner un article sous 30 jours à compter de sa livraison.",
      "Conditions. L'article doit être non porté, non utilisé et dans son emballage d'origine, avec ses étiquettes.",
      "Pièces sur mesure. Les créations réalisées sur mesure ou personnalisées à votre demande ne sont ni reprises ni échangées, sauf défaut.",
      "Droit de rétractation. Conformément au Code de la consommation, vous disposez de 14 jours à compter de la réception pour vous rétracter sans justifier de motif, sauf pour les créations personnalisées.",
      "Comment faire. Écrivez-nous via la page Contact en indiquant votre numéro de commande et l'article concerné ; nous vous indiquons la marche à suivre pour le retour.",
      "Remboursement. Une fois le retour reçu et vérifié, vous êtes remboursé sous environ 14 jours, sur le moyen de paiement utilisé à la commande. Les frais de livraison initiaux ne sont pas remboursés, sauf article défectueux ou non conforme.",
      "Article défectueux ou non conforme. Contactez-nous rapidement avec des photos ; nous trouvons une solution avec le partenaire.",
    ],
    en: [
      "Time limit. You may return an item within 30 days of its delivery.",
      "Conditions. The item must be unworn, unused and in its original packaging, with its tags.",
      "Made-to-measure pieces. Creations made to measure or personalised at your request cannot be returned or exchanged, except if defective.",
      "Right of withdrawal. In accordance with consumer law, you have 14 days from receipt to withdraw without giving a reason, except for personalised creations.",
      "How to proceed. Write to us via the Contact page with your order number and the item concerned; we tell you how to send it back.",
      "Refund. Once the return is received and checked, you are refunded within about 14 days, to the payment method used for the order. Original delivery fees are not refunded, unless the item is defective or not as described.",
      "Defective or non-conforming item. Contact us quickly with photos; we find a solution with the partner.",
    ],
  },
  terms: {
    fr: [
      "1. Objet. Les présentes conditions générales de vente régissent toute commande passée sur E póm ta’, galerie en ligne de créations d'artistes et de créateurs afrodescendants.",
      "2. Commandes. Toute commande vaut acceptation des présentes conditions. Un e-mail de confirmation est envoyé après validation. Chaque création étant une pièce unique, sa disponibilité est confirmée par le créateur.",
      "3. Prix. Les prix sont fixés par chaque partenaire et indiqués en euros (€), toutes taxes comprises. Le prix applicable est celui affiché au moment de la commande.",
      "4. Paiement. Le paiement s'effectue par carte bancaire au moment de la commande, avec authentification 3D Secure le cas échéant. La commande n'est traitée qu'après enregistrement du paiement.",
      "5. Livraison. Chaque créateur prépare la commande sous 2 jours ouvrés et l'expédie à l'adresse indiquée. Le transporteur et le numéro de suivi sont communiqués par e-mail. L'adresse reste modifiable tant que la commande n'est pas expédiée.",
      "6. Annulation. Une commande peut être annulée tant qu'elle n'est pas expédiée ; elle est alors remboursée intégralement sous 14 à 21 jours.",
      "7. Retours. Vous pouvez retourner un article sous 30 jours à compter de sa livraison, non porté et dans son emballage d'origine. Les pièces sur mesure ne sont pas retournables, sauf défaut. L'article retourné est remboursé sous environ 14 jours, hors frais de livraison initiaux.",
      "8. Droit de rétractation. Vous disposez de 14 jours à compter de la réception pour vous rétracter sans avoir à justifier de motif, sauf pour les créations personnalisées à votre demande.",
      "9. Responsabilité. E póm ta’ agit comme intermédiaire entre les acheteurs et les créateurs. Notre responsabilité ne saurait être engagée en cas de retard ou d'indisponibilité du transporteur ou de force majeure.",
      "10. Droit applicable. Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant toute action, à défaut de quoi les tribunaux compétents seront saisis.",
      "Pour toute question, contactez-nous via la page Contact.",
    ],
    en: [
      "1. Purpose. These terms and conditions of sale govern every order placed on E póm ta’, an online gallery of creations by artists and designers of African descent.",
      "2. Orders. Placing an order means accepting these terms. A confirmation email is sent once the order is validated. As each creation is a one-of-a-kind piece, its availability is confirmed by the creator.",
      "3. Prices. Prices are set by each partner and shown in euros (€), all taxes included. The price that applies is the one displayed when you order.",
      "4. Payment. Payment is made by card when you order, with 3D Secure authentication where applicable. The order is processed only once payment has been recorded.",
      "5. Delivery. Each creator prepares the order within 2 business days and ships it to the address provided. The carrier and tracking number are sent by email. The address can be changed as long as the order has not shipped.",
      "6. Cancellation. An order can be cancelled as long as it has not shipped; it is then refunded in full within 14 to 21 days.",
      "7. Returns. You may return an item within 30 days of delivery, unworn and in its original packaging. Made-to-measure pieces cannot be returned, except if defective. The returned item is refunded within about 14 days, excluding original delivery fees.",
      "8. Right of withdrawal. You have 14 days from receipt to withdraw without giving a reason, except for creations personalised at your request.",
      "9. Liability. E póm ta’ acts as an intermediary between buyers and creators. We cannot be held liable for carrier delays or unavailability, or force majeure.",
      "10. Governing law. These terms are governed by French law. In the event of a dispute, an amicable solution will be sought first, failing which the competent courts will have jurisdiction.",
      "For any question, contact us via the Contact page.",
    ],
  },
  privacy: {
    fr: [
      "1. ? propos de nous et de cette politique. E p?m ta? est une galerie en ligne de cr?ations d'artistes et de cr?ateurs afrodescendants. Nous sommes responsable du traitement de vos donn?es personnelles. Cette politique explique comment nous les collectons et les utilisons. Contact : contact@epomta.example. Le site s'adresse aux personnes majeures et n'est pas destin? aux enfants ; nous ne collectons pas sciemment de donn?es concernant des mineurs de moins de 15 ans.",
      "2. Sites tiers. Le site peut contenir des liens vers des sites externes et pr?sente les cr?ations de cr?ateurs partenaires. Ces tiers ont leurs propres politiques de confidentialit?, dont nous ne sommes pas responsables ; nous vous invitons ? les consulter.",
      "3. Informations collect?es. Fournies par vous : nom, adresse e-mail, mot de passe, adresses de livraison, t?l?phone, commandes, favoris, pr?f?rences d'alertes, messages adress?s au service client. Re?ues d'autres sources : si vous utilisez la connexion Google (facultative), nous recevons uniquement votre nom et votre e-mail. Collect?es par nos syst?mes : langue, r?gion, type d'appareil et de navigateur, donn?es de session, cookies et abonnement de notification push si vous l'activez. La cam?ra (Miroir) et les photos sont trait?es sur votre appareil et ne sont pas envoy?es ? nos serveurs.",
      "4. Utilisation de vos donn?es. Compte : nom, e-mail et mot de passe servent ? cr?er et g?rer votre compte (ex?cution du contrat). Commandes : articles, adresse et t?l?phone servent ? traiter et livrer vos commandes (ex?cution du contrat). Paiement : le r?glement par carte est trait? par notre prestataire ; nous ne conservons aucune donn?e de carte (ex?cution du contrat). Service client : vos messages et l'historique de commande servent ? r?pondre ? vos demandes (ex?cution du contrat, int?r?t l?gitime). Am?lioration du site : donn?es de navigation et d'appareil pour corriger et am?liorer le service (int?r?t l?gitime). Lutte contre la fraude : donn?es de commande et de connexion pour s?curiser le site et les paiements (int?r?t l?gitime, obligation l?gale). Marketing et alertes : e-mails et notifications que vous avez choisis (baisse de prix, favori indisponible, panier laiss?), uniquement avec votre consentement, retirable ? tout moment. Statistiques : donn?es agr?g?es et anonymis?es sur l'usage du site (int?r?t l?gitime).",
      "5. Partage de vos donn?es. Cr?ateurs partenaires : votre nom, adresse et t?l?phone pour exp?dier votre commande. Transporteurs : les donn?es n?cessaires ? la livraison et au suivi. Prestataires de paiement : les donn?es n?cessaires au r?glement. H?bergement et informatique : Vercel (h?bergement), Neon (base de donn?es, Francfort), service d'envoi d'e-mails, Google (connexion) et Photon/Komoot (suggestions d'adresses). Analyse : prestataires de mesure d'audience, sur donn?es agr?g?es. Autorit?s : lorsque la loi l'exige. Op?ration d'entreprise : en cas de fusion, cession ou r?organisation, vos donn?es peuvent ?tre transmises au repreneur, dans le respect de cette politique. Nous ne vendons pas vos donn?es.",
      "6. Transferts internationaux. Les cr?ateurs et transporteurs pouvant ?tre situ?s en Afrique ou en Europe, vos donn?es de livraison peuvent ?tre transmises hors de l'Union europ?enne, uniquement pour ex?cuter votre commande. Lorsque le pays n'offre pas un niveau de protection reconnu comme ad?quat, nous encadrons le transfert par des garanties appropri?es (clauses contractuelles types) ou, ? d?faut, il est n?cessaire ? l'ex?cution de votre commande.",
      "7. Cookies. N?cessaires : session, panier, langue et r?gion, indispensables au fonctionnement du site. Performance : mesure d'audience agr?g?e pour comprendre l'usage du site. Fonctionnalit? : m?morisation de vos pr?f?rences. Ciblage : nous n'utilisons aucun cookie publicitaire. Vous pouvez refuser ou supprimer les cookies non n?cessaires depuis les r?glages de votre navigateur ; les cookies n?cessaires ne peuvent pas ?tre d?sactiv?s sans alt?rer le site.",
      "8. S?curit?. Les ?changes sont chiffr?s (TLS/HTTPS), les mots de passe sont stock?s chiffr?s et jamais en clair, aucune donn?e de carte bancaire n'est conserv?e par nos soins et l'acc?s aux donn?es est restreint. Aucune mesure n'offrant une s?curit? absolue, prot?gez vos identifiants.",
      "9. Dur?e de conservation. Donn?es de compte : jusqu'? la suppression du compte. Commandes et factures : 10 ans (obligation comptable). Messages au service client : 3 ans apr?s le dernier ?change. Donn?es de navigation et d'alertes : tant que le compte est actif, puis supprim?es. Donn?es de cookies : 13 mois maximum.",
      "10. Vos droits. Vous pouvez demander l'acc?s ? vos donn?es, leur portabilit?, leur rectification, leur effacement, la limitation du traitement, ou vous opposer ? un traitement, et retirer votre consentement ? tout moment. ?crivez-nous ? contact@epomta.example. Nous pouvons vous demander un justificatif d'identit? pour v?rifier votre demande. Nous r?pondons dans un d?lai d'un mois. La suppression du compte efface vos donn?es personnelles.",
      "11. R?clamations. Pour toute question ou r?clamation, contactez-nous ? contact@epomta.example. Vous pouvez aussi saisir l'autorit? de protection des donn?es de votre pays de r?sidence (en France, la CNIL).",
      "12. Mises ? jour de cette politique. Nous pouvons modifier cette politique ; la version en vigueur est celle publi?e sur cette page, avec sa date de mise ? jour. En cas de changement important, nous vous en informerons. Derni?re mise ? jour : novembre 2026.",
    ],
    en: [
      "1. About us and this policy. E p?m ta? is an online gallery of creations by artists and designers of African descent. We are the controller of your personal data. This policy explains how we collect and use it. Contact: contact@epomta.example. The site is intended for adults and is not directed at children; we do not knowingly collect data from minors under 15.",
      "2. Third-party sites. The site may contain links to external sites and presents creations by partner creators. These third parties have their own privacy policies, for which we are not responsible; we encourage you to read them.",
      "3. Information we collect. Provided by you: name, email, password, delivery addresses, phone, orders, favourites, alert preferences, messages to customer service. Received from other sources: if you use Google sign-in (optional), we only receive your name and email. Collected by our systems: language, region, device and browser type, session data, cookies and a push-notification subscription if you enable it. The camera (Mirror) and photos are processed on your device and are not sent to our servers.",
      "4. How we use your data. Account: name, email and password are used to create and manage your account (contract). Orders: items, address and phone are used to process and deliver your orders (contract). Payment: card payment is processed by our provider; we store no card data (contract). Customer service: your messages and order history are used to answer your requests (contract, legitimate interest). Site improvement: browsing and device data to fix and improve the service (legitimate interest). Fraud prevention: order and login data to secure the site and payments (legitimate interest, legal obligation). Marketing and alerts: emails and notifications you chose (price drop, favourite unavailable, abandoned cart), only with your consent, which you can withdraw at any time. Statistics: aggregated, anonymised data about site usage (legitimate interest).",
      "5. Sharing your data. Partner creators: your name, address and phone to ship your order. Carriers: the data needed for delivery and tracking. Payment providers: the data needed to process payment. Hosting and IT: Vercel (hosting), Neon (database, Frankfurt), an email-sending service, Google (sign-in) and Photon/Komoot (address suggestions). Analytics: audience-measurement providers, on aggregated data. Authorities: where required by law. Corporate transactions: in a merger, sale or reorganisation, your data may be transferred to the successor, subject to this policy. We do not sell your data.",
      "6. International transfers. As creators and carriers may be located in Africa or Europe, your delivery data may be sent outside the European Union, only to fulfil your order. Where the country does not offer a recognised adequate level of protection, we frame the transfer with appropriate safeguards (standard contractual clauses) or, failing that, it is necessary to perform your order.",
      "7. Cookies. Necessary: session, cart, language and region, essential for the site to work. Performance: aggregated audience measurement to understand site usage. Functionality: remembering your preferences. Targeting: we use no advertising cookies. You can refuse or delete non-essential cookies in your browser settings; necessary cookies cannot be disabled without affecting the site.",
      "8. Security. Exchanges are encrypted (TLS/HTTPS), passwords are stored hashed and never in clear text, we store no card data and access to data is restricted. As no measure offers absolute security, please protect your credentials.",
      "9. Retention. Account data: until you delete your account. Orders and invoices: 10 years (accounting obligation). Customer-service messages: 3 years after the last exchange. Browsing and alert data: while your account is active, then deleted. Cookie data: 13 months maximum.",
      "10. Your rights. You can request access to your data, portability, rectification, erasure, restriction of processing, object to processing, and withdraw your consent at any time. Write to contact@epomta.example. We may ask for proof of identity to verify your request. We reply within one month. Deleting your account erases your personal data.",
      "11. Complaints. For any question or complaint, contact us at contact@epomta.example. You may also lodge a complaint with the data protection authority of your country of residence (in France, the CNIL).",
      "12. Updates to this policy. We may change this policy; the version in force is the one published on this page, with its update date. We will let you know of any significant change. Last updated: November 2026.",
    ],
  },
  cookies: {
    fr: [
      "Qu'est-ce qu'un cookie ? Un cookie est un petit fichier enregistré sur votre appareil par le site. Nous l'utilisons pour faire fonctionner le site et mémoriser vos choix.",
      "Strictement nécessaires (toujours actifs). Session, panier, langue et région : indispensables au fonctionnement du site, ils ne peuvent pas être désactivés.",
      "Performance. Mesure d'audience agrégée pour comprendre comment le site est utilisé et l'améliorer.",
      "Préférences. Mémorisation de vos choix (langue, région, favoris) pour personnaliser votre visite.",
      "Publicité. Nous n'utilisons aucun cookie publicitaire.",
      "Gérer les cookies. Vous pouvez supprimer ou bloquer les cookies non nécessaires depuis les réglages de votre navigateur ; les cookies nécessaires ne peuvent pas être désactivés sans altérer le site. La durée de vie des cookies n'excède pas 13 mois.",
      "Questions. Écrivez-nous via la page Contact.",
    ],
    en: [
      "What is a cookie? A cookie is a small file saved on your device by the site. We use them to make the site work and remember your choices.",
      "Strictly necessary (always active). Session, cart, language and region: essential for the site to work, they cannot be disabled.",
      "Performance. Aggregated audience measurement to understand how the site is used and improve it.",
      "Preferences. Remembering your choices (language, region, favourites) to personalise your visit.",
      "Advertising. We use no advertising cookies.",
      "Managing cookies. You can delete or block non-essential cookies in your browser settings; necessary cookies cannot be disabled without affecting the site. Cookie lifetime does not exceed 13 months.",
      "Questions. Write to us via the Contact page.",
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

const KEYS = ["faq", "orders", "payment", "returns", "terms", "privacy", "cookies", "contact", "about", "discounts", "doNotSell", "credits"] as const;
type Key = (typeof KEYS)[number];
const keyOf = (slug: string) => {
  const s = slug === "do-not-sell" ? "doNotSell" : slug;
  return (KEYS as readonly string[]).includes(s) ? (s as Key) : null;
};

const HELP_LABELS: Record<string, { fr: string; en: string }> = {
  orders: { fr: "Commandes et livraison", en: "Orders and delivery" },
  payment: { fr: "Paiement et tarification", en: "Payment and pricing" },
  returns: { fr: "Retours et remboursements", en: "Returns and refunds" },
  cookies: { fr: "Cookies", en: "Cookies" },
};
const HELP_NAV = ["faq", "orders", "payment", "returns", "terms", "privacy", "cookies", "contact"] as const;

function labelOf(locale: Locale, key: Key) {
  const d = getDict(locale);
  if (key in HELP_LABELS) return HELP_LABELS[key][locale === "en" ? "en" : "fr"];
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
  const en = locale === "en";
  const isHelp = (HELP_NAV as readonly string[]).includes(key);
  const content = (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl text-primary">{labelOf(locale, key)}</h1>
      {body.map((p) => (
        <p key={p} className="text-sm leading-relaxed">
          {p}
        </p>
      ))}
      {isHelp && (
        <HelpFeedback
          question={en ? "Did you find this content helpful?" : "Ce contenu vous semble-t-il pertinent ?"}
          yes={en ? "Yes" : "Oui"}
          no={en ? "Not really" : "Pas vraiment"}
          thanks={en ? "Thank you for your feedback." : "Merci pour votre retour."}
        />
      )}
    </div>
  );
  return (
    <div className={`mx-auto space-y-4 ${isHelp ? "max-w-4xl" : "max-w-xl"}`}>
      <Link href={`/${locale}/account`} className="text-sm text-muted-foreground hover:text-terracotta">
        ‹ {t.back}
      </Link>
      {isHelp ? (
        <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
          <nav aria-label={en ? "Help" : "Aide"} className="text-sm">
            <h2 className="mb-2 font-semibold uppercase tracking-wide">{en ? "Help" : "Aide"}</h2>
            <ul className="space-y-1">
              {HELP_NAV.map((k) => (
                <li key={k}>
                  <Link href={`/${locale}/support/${k}`} aria-current={k === key ? "page" : undefined} className={`block py-1 hover:underline ${k === key ? "font-semibold underline" : ""}`}>
                    {labelOf(locale, k)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {content}
        </div>
      ) : (
        content
      )}
    </div>
  );
}
