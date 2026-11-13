# Plan — Stripe Connect (comptes Express, KYC hébergé par Stripe, SANDBOX uniquement)

Rédigé le 13/11/2026 après lecture de `src/lib/stripe-checkout.ts`, `src/lib/ledger.ts`, `src/lib/refund.ts`, `src/app/api/stripe/webhook/route.ts`, `src/app/[locale]/admin/versements*`, `fournisseur/(portal)/paiements`.

## Situation actuelle (lu dans le code)
- Une session Stripe Checkout par panier, encaissée sur le compte de la **plateforme** (EUR). Un panier peut contenir des créations de **plusieurs partenaires** (un colis `SubOrder` par partenaire).
- Le webhook `checkout.session.completed` crée la commande depuis la réservation (`consumeHold`).
- Remboursement (`refund.ts`) = remboursement du PaymentIntent de la plateforme, avant tout versement.
- Registre `LedgerEntry` créé à la livraison : brut, commission (15 % par défaut), net ; « en attente » pendant `LEDGER_HOLD_DAYS` (7 j), puis « disponible », puis « versé » via `createPayout` (référence `TEST-…`, aucun mouvement d'argent).
- Acceptation partenaire sous 48 h : tant que le colis n'est pas accepté/expédié/livré, rien n'est dû au partenaire.
- Aucun SDK Stripe : appels REST via `fetch` (on garde cette approche, sans nouvelle dépendance).

## Modèle recommandé : charges séparées + transferts (« separate charges and transfers »)
Pourquoi pas les « destination charges » :
1. Un panier = plusieurs partenaires ; une destination charge n'a qu'une seule destination.
2. Notre argent n'est dû qu'après livraison + fenêtre de retour (7 j) ; avec une destination charge les fonds partent au paiement, et un refus/expiration à 48 h obligerait à récupérer l'argent chez le partenaire (transfer reversal).
3. Nos remboursements restent inchangés (remboursement du PaymentIntent de la plateforme, fonds encore chez nous).
Donc : l'encaissement ne change pas ; au **versement** (bouton admin) on crée un `Transfer` Stripe de `netCents` vers le compte connecté du partenaire. Source : documentation Stripe « Separate charges and transfers » (lue 13/11/2026 : `cross-border-payouts` confirme que ce flux est supporté sans `on_behalf_of`).

## Qui supporte les frais Stripe
Par défaut la **plateforme** (frais de traitement sur l'encaissement, et éventuels frais Connect). Le net partenaire = brut − commission, inchangé. À valider commercialement : je ne connais pas la grille de frais Connect exacte ; ne pas l'inventer (voir stripe.com/connect/pricing).

## Cas « vérification incomplète »
Statut interne dérivé de l'objet Account (`account.updated`) : `NONE` (pas de compte), `PENDING` (compte créé, `details_submitted` faux), `RESTRICTED` (soumis mais `payouts_enabled`/capacité transferts inactive ou `requirements.currently_due` non vide), `ACTIVE`. Versement **bloqué** hors `ACTIVE` (clé Stripe présente) ; message explicite côté admin, bouton « Reprendre la configuration » côté partenaire (nouveau lien d'onboarding).

## Schéma (migration 0027, additive)
- `Supplier.stripeAccountId String? @unique`, `stripeConnectStatus String @default("NONE")`, `stripeDetailsSubmitted Boolean @default(false)`, `stripePayoutsEnabled Boolean @default(false)`, `stripeRequirementsDue String @default("")`.
- `Payout.stripeTransferId String?`.

## Lots
1. Schéma + `src/lib/stripe-connect.ts` (création de compte, lien d'onboarding, statut, transfert ; `fetch` injectable pour les tests).
2. Action partenaire « Configurer mes paiements » + statut sur `/fournisseur/paiements` ; badge côté admin.
3. Webhook `account.updated`.
4. Versement : blocage tant que non vérifié + transfert Stripe (rollback du registre si le transfert échoue).

## Ce que je ne sais pas / à vérifier en sandbox (honnêteté)
- **Pays des partenaires** : la doc Stripe (cross-border payouts) indique que les versements transfrontaliers self-serve ne concernent que des plateformes et comptes situés dans les régions US/UK/EEE/Canada/Suisse ; pour les autres pays (ex. Cameroun, Côte d'Ivoire) il faut « Global Payouts » ou Stripe sales, et le contrat « recipient » ne permet pas le cross-border classique. **Risque majeur pour des partenaires africains** : non résolu par ce chantier, à confirmer avec Stripe avant toute mise en production. Le sandbox permet de tester le parcours avec un pays supporté (ex. FR).
- Webhook : les événements `account.updated` des comptes connectés nécessitent un endpoint « Connect » (écouter les comptes connectés) ; il peut avoir un secret distinct → variable optionnelle `STRIPE_CONNECT_WEBHOOK_SECRET` (le secret existant reste accepté).
- Capacités exactes à demander à la création (`transfers` seul vs `card_payments` + `transfers`) selon l'accord de service : à vérifier en sandbox ; le code demande `transfers`.
- Aucune clé live, aucun secret dans le dépôt ; sandbox uniquement.

## Afrique subsaharienne : réponse après lecture de la doc Stripe (13/11/2026)
Sources lues : `docs/connect/connect-cross-border-payouts` et `docs/global-payouts/recipient-requirements` (liste tronquée à « Sweden », tableau « expéditeur US / destinataire société »).
- **Connect Express classique** : les versements cross-border self-serve ne concernent que des plateformes ET comptes dans US/UK/EEE/Canada/Suisse. Un partenaire au Cameroun, Sénégal, Côte d'Ivoire… **ne peut pas** être un compte Express rattaché à une plateforme européenne par ce biais. Je n'ai pas lu la page « pays où Stripe ouvre un compte » : à confirmer, mais la doc ci-dessus suffit à conclure que le chemin Express n'est pas self-serve.
- **Global Payouts** (alternative Stripe, destinataires hors Express) : plateformes de certains pays seulement (pays de la plateforme E póm ta' à vérifier : https://docs.stripe.com/global-payouts#availability). Dans le tableau « expéditeur US / société » j'ai lu : Côte d'Ivoire (XOF, virement local), Sénégal (XOF, local), Bénin (XOF), Maroc (MAD), Kenya, Rwanda, Éthiopie, Égypte, Afrique du Sud, Madagascar, Maurice, Mozambique, Namibie, Botswana, Gambie, Algérie. **Cameroun : absent de la partie lue** (entre Brunei et Canada, rien). Partie après « Sweden » non lue (Tanzanie, Ouganda, Zambie, etc. inconnus). Les exigences varient selon le pays de l'expéditeur : non vérifié pour notre pays.
- Ce que je ne sais pas : pays de la plateforme, disponibilité réelle de Global Payouts pour elle (accès possiblement sur demande), frais, délais, et si les personnes physiques (artisans) sont acceptées (tableau lu = « société » seulement).

## Alternatives et recommandation
1. **Virement manuel + KYC interne** (état actuel) : zéro dépendance, mais charge opérationnelle et conformité (vérif. identité, LCB-FT) à notre charge.
2. **Wise Business / API Wise** : virements vers XOF/XAF/etc. selon corridors (couverture et frais à vérifier chez Wise, non lus).
3. **Mobile money** (Orange Money, MTN MoMo, Wave) via agrégateur (ex. CinetPay, Flutterwave, Paystack…) : adapté à l'Afrique de l'Ouest/Centrale, intégration et KYC à étudier (non vérifié ici).
4. **Global Payouts Stripe** : à étudier si disponible pour notre pays ; demander à Stripe sales.
**Recommandation** : ne pas implémenter Connect Express maintenant (inadapté aux partenaires africains). Garder le registre + versements manuels, ajouter un KYC interne léger (pièce d'identité + coordonnées de paiement), et interroger Stripe sur Global Payouts / comparer Wise. Le code Connect déjà ébauché (non commité) reste utile seulement pour des partenaires dans les régions supportées. En attente de l'accord de l'utilisateur.

## Mise à jour 13/11/2026 — plateforme en Belgique : éligibilité probablement NON
Faits lus dans la doc Stripe (pages `global-payouts`, `global-payouts/payout-methods`, `connect-cross-border-payouts`) :
- Global Payouts : émetteurs en disponibilité générale = **US et UK uniquement** ; la Belgique (BE) figure seulement en **préversion privée** (accès sur demande). Il exige aussi Stripe **Treasury** et fonctionne avec des « recipients » (pas des comptes Express). Pays africains destinataires (liste vérifiée par l'utilisateur) : Bénin, Côte d'Ivoire, Sénégal, Afrique du Sud, Algérie, Botswana, Égypte, Éthiopie, Gambie, Kenya, Madagascar, Maroc, Maurice, Mozambique, Namibie, Rwanda, Tanzanie, Tunisie ; **absents : Cameroun, Nigeria, Ghana, RDC, Mali, Burkina Faso**.
- Connect cross-border : seulement US/UK/EEE/Canada/Suisse des deux côtés → pas d'Afrique subsaharienne.
- Conclusion : avec un compte plateforme belge, ni Express ni Global Payouts (hors préversion) ne sont garantis. **À confirmer par le support Stripe.** Non lu : conditions de la préversion, frais, personnes physiques acceptées ou non, API exacte de Global Payouts (le code d'ébauche appelle l'API Express v1, non adaptée à Global Payouts).

### Brouillon de question au support Stripe (à envoyer)
> Bonjour, nous exploitons une marketplace d'art et de couture (compte plateforme établi en Belgique, paiements en EUR) et souhaitons verser leurs ventes à des créateurs indépendants (personnes physiques et petites structures) situés au Bénin, en Côte d'Ivoire, au Sénégal (XOF) et au Cameroun. 1) Est-il possible, depuis un compte belge, de verser à ces pays via Connect (comptes Express/Custom, accord « recipient » ou autre) ? 2) Global Payouts est-il accessible à une plateforme belge (préversion privée) ? Quels délais, prérequis (Treasury) et frais ? 3) Les bénéficiaires personnes physiques sans société sont-ils acceptés, avec quelles pièces KYC ? 4) Le Cameroun est-il prévu ? 5) Existe-t-il une alternative recommandée (ex. partenaire de payout) pour ces corridors ? Merci.

### Comparaison des plans B (non vérifié sauf mention)
| Option | Avantages | Limites / inconnues |
| --- | --- | --- |
| Virement manuel + KYC interne (actuel) | Aucun coût d'intégration, fonctionne pour tous les pays, registre déjà en place | Charge manuelle, frais bancaires/SWIFT de notre banque (non chiffrés), conformité KYC/LCB-FT à notre charge |
| Wise (Business, éventuellement API) | Virements locaux dans de nombreuses devises | Non vérifié : couverture XOF/XAF (Cameroun), frais, limites, ouverture d'un compte Business belge, API pour paiements en lot |
| Mobile money (Orange Money, MTN MoMo, Wave) via agrégateur | Très répandu chez les créateurs, rapide | Non vérifié : agrégateur à choisir, couverture par pays, frais, contrat/KYC marchand, conformité (licences) |
Recommandation provisoire : garder versements manuels + KYC interne léger ; ne pas poursuivre Connect avant la réponse de Stripe ; évaluer Wise en parallèle (compte Business, test sur un virement réel de faible montant hors production du POC).

### État de l'implémentation (gelée)
Écrit (non testé en sandbox, non branché dans l'UI) : champs Supplier/Payout + migration 0027, `src/lib/stripe-connect.ts` (interrupteur `STRIPE_CONNECT_ENABLED`, désactivé par défaut), `src/lib/payout.ts` (blocage + transfert + annulation du registre), `src/lib/connect-countries.ts`, action « Configurer mes paiements » (non affichée), webhook `account.updated`, badge admin. Connect désactivé = comportement manuel inchangé. Pas de tests A-T dédiés ni bloc T-CONNECT : prévus seulement après la réponse de Stripe.