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
