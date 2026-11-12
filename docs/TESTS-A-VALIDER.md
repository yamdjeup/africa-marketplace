# Tests Ã  valider â€” E pÃ³m taâ€™

Fichier UNIQUE de tests (rÃ¨gle permanente : chaque lot ajoute ses tests ici, avec Ã©tapes numÃ©rotÃ©es dÃ©taillÃ©es ; aucun autre fichier de tests). Mis Ã  jour Ã  chaque lot (mÃªme commit). Statut : TestÃ© (validÃ© par l'utilisateur) / Ã€ tester. Les tests historiques (lots A Ã  D, suspension, traduction, fiche crÃ©ation) sont en fin de fichier (H-xx). Comptes : Client (compte client), CrÃ©ateur (partenaire actif), Admin (e-mail dans `ADMIN_EMAILS`), partenaires de test KeNoF, Nathalie MorÃ¨re, Cruzz Taylor (`npm run db:seed-suppliers`).

## BLOC B â€” Tests automatisÃ©s (exÃ©cutÃ©s par l'agent)

Relancer : `npm test` (Vitest, sans base) ; `npm run test:all` (base jetable `TEST_DATABASE_URL` + Vitest + Playwright). DÃ©tails : `docs/DEPLOIEMENT.md`, section Â« Tests automatisÃ©s Â». Ce tableau est mis Ã  jour Ã  chaque exÃ©cution.

Lancer : GitHub â€º Actions â€º Â« Tests automatisÃ©s Â» â€º Run workflow (aussi sur chaque PR/push vers main) ; rÃ©sultats dans l'artefact `resultats-tests` (rapport Playwright HTML + JUnit Vitest) ; les tests sur base rÃ©elle (A-T4) y tournent sur la branche Neon de test. Config : docs/DEPLOIEMENT.md.

Parcours historiques (Actions #1, 10/11/2026) : search 4 et mobile 2 corrigÃ©s (textes pÃ©rimÃ©s, recherche "sculpture", langue mobile via /login, bouton Â« VÃ©rifier mon adresse Â»). journey.spec.ts : test 1 corrigÃ© ; les tests 2 Ã  11 (galerie, fiche Å“uvre/artiste, panier, inscription x2, connexion, checkout connectÃ©/invitÃ©/vide) sont marquÃ©s `test.skip` (Â« Ã  rÃ©Ã©crire : header/checkout 2 Ã©tapes Â») ; journey : 1 OK / 10 ignorÃ©s.

DerniÃ¨re exÃ©cution : 10/11/2026 â€” Vitest 33 OK / 6 ignorÃ©s (base de test non disponible sur le poste de l'agent : sans Docker ni branche Neon) ; Playwright `e2e/lot-t.spec.ts` 23 OK.
DerniÃ¨re exÃ©cution (11/11/2026, lot admin + e-mails de retour) : Vitest 62 OK / 6 ignorÃ©s (base de test indisponible sur le poste de l'agent) ; tsc et eslint sans erreur.

| ID | Lot | Description | Fichier | Dernier rÃ©sultat | Couvre (manuel) |
|---|---|---|---|---|---|
| A-T1 | T | Webhook Stripe : signature valide/invalide/expirÃ©e/absente | `tests/unit/stripe-signature.test.ts` (Vitest) | OK 5/5 â€” 10/11/2026 | T-STRIPE 8 |
| A-T2 | T | Webhook HTTP : 400 si signature invalide, 200 si valide | `e2e/lot-t.spec.ts` (Playwright) | OK 2/2 â€” 10/11/2026 | T-STRIPE 8 |
| A-T3 | T | Remboursement : DONE / FAILED / MANUAL / AWAITING, idempotence | `tests/unit/refund.test.ts` (Vitest) | OK 8/8 â€” 10/11/2026 | T-REMB (logique) |
| A-T4 | T | Double annulation concurrente, annulation aprÃ¨s expÃ©dition, expiration 48 h, droits d'accÃ¨s, AWAITING (base rÃ©elle) | `tests/unit/suborders.db.test.ts` (Vitest) | IgnorÃ© 6/6 (sans `TEST_DATABASE_URL`) â€” Ã  lancer avec `npm run test:all` | T-COLIS (logique) |
| A-T5 | T | Garde-fou base de test (refuse prod/mÃªme URL/clÃ© live) | `tests/unit/guard.test.ts` (Vitest) | OK 4/4 â€” 10/11/2026 | â€” |
| A-T6 | T | E-mails : aucune mention interdite, images en URL absolue https | `tests/unit/emails.test.ts` (Vitest) | OK 5/5 â€” 10/11/2026 | T-MAILS 1 (URL ; rendu visuel reste manuel) |
| A-T7 | T | Bandeau : aucune requÃªte GA ni cookie `_ga` avant consentement/refus ; choix mÃ©morisÃ© ; accepter charge gtag | `e2e/lot-t.spec.ts` (Playwright) | OK 3/3 â€” 10/11/2026 | T-GA4 (parties rÃ©seau/cookies) |
| A-T8 | T | Pages d'aide FR/EN : 200, texte prÃ©sent, sans mention interdite (7 pages Ã— 2 langues ; exemple de nÂ° de commande au format rÃ©el AM-1A2B3C4D) | `e2e/lot-t.spec.ts` (Playwright) | OK 14/14 â€” 10/11/2026 | T-AIDE (hors relecture) |
| A-T9 | T | AccÃ¨s : visiteur redirigÃ© depuis admin, retours admin, commandes partenaire, commandes client | `e2e/lot-t.spec.ts` (Playwright) | OK 4/4 â€” 10/11/2026 | H (accÃ¨s) |
| A-M1 | M | Fournisseur e-mail : Resend (from, reply_to, sans mention interdite) ; repli Gmail / aucun sans erreur | `tests/unit/email-provider.test.ts` (Vitest) | OK 2/2 â€” 10/11/2026 | T-MAIL-FROM (payload) |
| A-M2 | M | Mur d'accÃ¨s : images `/api/media/<id>` et `/images/artworks/*` publiques, reste fermÃ© | `tests/unit/proxy-images.test.ts` (Vitest) | OK 2/2 â€” 10/11/2026 | T-MAIL-FROM 3 |
| A-E1 | E | Retours : Ã©ligibilitÃ© (livrÃ©, 30 j, doublon), propriÃ©taire, motif, dÃ©cision unique, remboursement DONE/Ã©chec + Ã©criture comptable annulÃ©e | `tests/unit/returns.test.ts` (Vitest) | OK 11/11 â€” 10/11/2026 | T-RETOUR 3-7 (logique) |
| A-F1 | F | Listes admin et partenaire : paramÃ¨tres d'URL (statut par dÃ©faut Â« Ã  traiter Â», dates, page â‰¥ 1), pagination 25/page, filtres Commandes/Versements/Retours/Candidatures/Partenaires, espace partenaire limitÃ© Ã  son compte, pastilles de compteur (admin et partenaire) | `tests/unit/admin-list.test.ts` (Vitest) | OK 21/21 â€” 11/11/2026 | T-ADMIN-FILTRES 1-9 (logique) |
| A-F2 | F | E-mails de retour (demande reÃ§ue, acceptÃ©, refusÃ©, remboursÃ©) FR/EN : gabarit DA, image en URL absolue, aucune mention interdite, motif et montant (â‚¬) | `tests/unit/admin-list.test.ts` (Vitest) | OK 10/10 â€” 11/11/2026 | T-RETOUR 2, 4-6 (contenu) |
| A-F3 | F | RÃ¨gle DA : tout e-mail sortant est habillÃ© du gabarit commun (`ensureTemplate`), `lang=` et Content-Language corrects, aucun envoi direct hors `src/lib/email.ts` | `tests/unit/email-template-guard.test.ts` (Vitest) | OK 4/4 â€” 11/11/2026 | T-RETOUR 2 (langue FR dans Gmail) |
| A-F4 | F | Contact : e-mail unique contact@epomta.com, tÃ©lÃ©phones masquÃ©s sans variable CONTACT_PHONE_LOCAL/INTL | `tests/unit/contact.test.ts` (Vitest) | OK 2/2 â€” 11/11/2026 | T-CONTACT (logique) |
| A-F5 | F | Page commande : texte Â« retour sous 30 jours Â» masquÃ© si un retour existe ; rÃ¨gle `live` (Å“uvre sans partenaire invisible) | `tests/unit/tracking-notice.test.ts`, `tests/unit/catalog-live.test.ts` (Vitest) | OK â€” 11/11/2026 | T-COLIS-REMB 1 |
| A-F6 | F | Bouton Â« RÃ©initialiser Â» des filtres (garde l'onglet de statut) | `tests/unit/list-reset.test.ts` (Vitest) | OK 2/2 â€” 11/11/2026 | T-FILTRES-RESET (logique) |
| A-F8 | F | RÃ¨gle Â« action restante Â» (onglet + pastille admin) : colis en cours, ou remboursement MANUAL/FAILED avec paiement rÃ©el ; expirÃ©e sans paiement = annulÃ©e | `tests/unit/todo-rule.test.ts` (Vitest) | OK 4/4 â€” 11/11/2026 | T-ADMIN-FILTRES 4 |
| A-F11 | F | URL de retour Stripe/liens : domaine de la requÃªte (liste blanche epomta.com, epomta-demo.vercel.app), sinon origine configurÃ©e | `tests/unit/origin.test.ts` (Vitest) | OK 3/3 â€” 11/11/2026 | T-DOMAINE |
| A-F12 | F | Nom d'article cliquable vers la fiche produit dans le rÃ©capitulatif e-mail (annulÃ©e, en routeâ€¦) | `tests/unit/email-item-link.test.ts` (Vitest) | OK 2/2 â€” 11/11/2026 | T-RACHAT-LIEN |
| A-F13 | F | Mur d'accÃ¨s actif sur epomta.com, www.epomta.com et epomta-demo.vercel.app (page, API ; exemptions webhook/mÃ©dias conservÃ©es) ; robots.txt Disallow + noindex | `tests/unit/wall-hosts.test.ts` (Vitest) + `e2e/access.spec.ts` | OK 3/3 unit â€” 12/11/2026 | T-MUR-EPOMTA |
| A-F14 | F | Transporteur Â« Autre Â» â†’ Â« Other Â» en EN (`carrierLabel`) ; image exemple non bloquÃ©e par le mur (`/images/examples/*`) | `tests/unit/partner-profile.test.ts`, `tests/unit/proxy-images.test.ts` (Vitest) | Ã€ lancer | T-AUTRE-EN, T-IMG-EXEMPLE |
| A-F15 | F | Profil partenaire : validation e-mail/tÃ©lÃ©phone/adresse ; journal Â« champ : ancienne â†’ nouvelle valeur Â» | `tests/unit/partner-profile.test.ts` (Vitest) | Ã€ lancer | T-PROFIL-PARTENAIRE, T-PROFIL-ADMIN || A-F10 | F | Montants des e-mails au format de la langue (EN Â« â‚¬55.00 Â», FR Â« 55,00 â‚¬ Â») | `tests/unit/money-locale.test.ts` (Vitest) | OK 2/2 â€” 11/11/2026 | T-MAILS (format EN) |
| A-F16 | F | E-mails partenaire envoyÃ©s Ã  l'e-mail de contact du profil, repli sur l'e-mail du compte (partnerRecipient) | `tests/unit/partner-recipient.test.ts` (Vitest) | Ã€ lancer | T-EMAIL-CONTACT |
| A-F17 | F | Â« use server Â» en premiÃ¨re instruction de tous les fichiers *actions.ts (Ã©vite l'Ã©chec du build Vercel) | `tests/unit/use-server.test.ts` (Vitest) | OK 1/1 â€” 12/11/2026 | â€” |
| A-F18 | F | Paiement avant commande : rÃ©servation 30 min sans commande ni e-mail ; commande + colis crÃ©Ã©s une seule fois au paiement (idempotent) ; reconfirmation du mÃªme acheteur ; libÃ©ration/balayage ; paiement aprÃ¨s expiration (re-rÃ©servation, sinon aucune commande + remboursement) ; erreur de stock nominative | `tests/unit/checkout-hold.db.test.ts` (Vitest, base jetable `TEST_DATABASE_URL`, exÃ©cutÃ© en CI) ; filtre archivage dans `tests/unit/admin-list.test.ts` | Ã€ lancer en CI (non exÃ©cutable sans PostgreSQL local) | T-PAIEMENT-AVANT-COMMANDE, T-RESERVATION-IMPAYEE, T-STOCK-NOM, T-ARCHIVAGE |
| A-F19 | F | Archivage des commandes impayées (simulation sans écriture ; ignore expédiées/remboursées) | `tests/unit/archive-unpaid.test.ts` (Vitest) | À lancer | T-ARCHIVAGE |
| A-F9 | F | Mur d'accÃ¨s : API et images hors exemptions bloquÃ©es (401), artworks e-mail publics (â‰  401), manifeste/icÃ´nes PWA | `e2e/access.spec.ts` (Playwright) | OK 5/5 en local â€” 11/11/2026 (CI Ã  relancer) | â€” |

Parcours Playwright historiques (`e2e/journey.spec.ts`, `access.spec.ts`, `alerts.spec.ts`, `search.spec.ts`, `order-email.spec.ts`, `mobile.spec.ts`) : inchangÃ©s, non relancÃ©s dans ce lot.

## BLOC A â€” Tests manuels (Ã  faire par l'utilisateur)

Les tests ci-dessous restent manuels (rendu visuel, e-mails dans Gmail, mobile, relecture des textes, tableau de bord Stripe). Quand un point est couvert par le bloc B, c'est indiquÃ©.

## Lots rÃ©cents

### T-MAIL-FROM â€” E-mail rÃ©el depuis contact@epomta.com â€” 10 min â€” ValidÃ© le 10/11/2026 sauf l'Ã©tape 3 (images : correctif /images/artworks, Ã  revÃ©rifier) â€” date : 10/11/2026
PrÃ©requis : RESEND_API_KEY et MAIL_FROM dÃ©finis sur Vercel.
1. Passer une commande test (ou renvoyer le webhook) avec une adresse Gmail. RÃ©sultat : e-mail reÃ§u.
2. VÃ©rifier l'expÃ©diteur : Â« Epomta <contact@epomta.com> Â».
3. VÃ©rifier que les images s'affichent.
4. VÃ©rifier le dossier : boÃ®te de rÃ©ception, pas spam.
5. Gmail â€º â‹® â€º Afficher l'original : DKIM, SPF, DMARC = PASS.
6. RÃ©pondre : la rÃ©ponse arrive dans contact@epomta.com (Zimbra).

### T-RETOUR â€” Retours (lot E) â€” 15 min â€” Ã€ tester â€” date : â€”
PrÃ©requis : migration 0023 appliquÃ©e ; un colis livrÃ© (compte client) ; compte admin (ADMIN_EMAILS).
1. Compte client : Mon compte â€º Mes commandes â€º commande dont le colis est Â« LivrÃ© Â». RÃ©sultat : champ Â« Motif du retour Â» et bouton Â« Demander un retour Â».
2. Saisir un motif, cliquer sur Â« Demander un retour Â». RÃ©sultat : mention Â« Retour demandÃ© Â» Ã  la place du formulaire ; e-mail de confirmation reÃ§u dans Gmail (rendu visuel Ã  relire).
3. Compte admin : menu Admin â€º Retours. RÃ©sultat : la demande apparaÃ®t avec colis, montant (â‚¬) et motif.
4. Cliquer Â« Refuser Â» avec une note. RÃ©sultat : statut Â« Retour refusÃ© Â», e-mail client avec le motif. (Refaire avec une autre demande pour la suite.)
5. Cliquer Â« Accepter Â». RÃ©sultat : statut Â« Retour acceptÃ© Â», e-mail client.
6. Cliquer Â« Rembourser (Stripe) Â». RÃ©sultat : statut Â« RemboursÃ© Â» ; dans le dashboard Stripe (sandbox), un remboursement du montant du colis (â‚¬) existe ; e-mail client.
7. Sans paiement Stripe : cliquer Â« Rembourser Â» puis Â« Marquer remboursÃ© (manuel) Â». RÃ©sultat : message d'erreur puis statut Â« RemboursÃ© Â».
8. Colis livrÃ© depuis plus de 30 jours ou non livrÃ© : aucun formulaire de retour. Version anglaise : textes en EN.

| ID | Lot | DurÃ©e | Statut | Date |
|---|---|---|---|---|
| T-GA4 | GA4 + consentement | 15 min | Ã€ tester | â€” |
| T-COLIS | Multi-colis + annulation | 20 min | TestÃ© | 12/11/2026 |
| T-SUIVI | Suivi de livraison + remboursement (lots 1â€“2) | 15 min | Partiel : Ã©tape 3 testÃ©e le 12/11/2026 | 12/11/2026 |
| T-MAILS | E-mails Farfetch | 10 min | Partiel : Ã©tape 1 testÃ©e | 10/11/2026 |
| T-AIDE | Pages d'aide FR/EN | 10 min | Ã€ tester | â€” |
| T-ADMIN-FILTRES | Filtres, pagination et pastilles (admin + partenaire) ; e-mails de retour | 20 min | Ã€ tester | â€” |
| T24 | Parcours de commande complet (achat â†’ livraison) | 20 min | Ã€ tester | â€” |
| T-STRIPE | Paiement Stripe Checkout + webhook (lot 0) | 15 min | Partiel : Ã©tapes 1, 2, 3, 4, 5, 8 testÃ©es ; 6, 7 Ã  tester | 10/11/2026 |
| T-REMB | Remboursement au refus/expiration/annulation | 15 min | Partiel : Ã©tapes 1, 2 testÃ©es | 10/11/2026 |
| H-01 Ã  H-16 | Lots A Ã  D, suspension, traduction, fiche crÃ©ation | 60 min | Ã€ tester | â€” |

### T-GA4 â€” GA4 et bandeau de consentement
PrÃ©requis : `NEXT_PUBLIC_GA_ID` dÃ©fini (ex. G-XXXX) ; navigation privÃ©e, onglet RÃ©seau/Application des outils dÃ©veloppeur ouvert.
1. Ouvrir `/fr` en navigation privÃ©e. RÃ©sultat : bandeau avec Â« Accepter tout Â», Â« Refuser tout Â», Â« Personnaliser Â».
2. Avant tout clic : onglet RÃ©seau, aucune requÃªte vers googletagmanager/google-analytics ; Application > Cookies : aucun `_ga`.
3. Cliquer Â« Refuser tout Â» : bandeau fermÃ©, toujours aucune requÃªte ni cookie `_ga`.
4. Recharger : le bandeau ne revient pas (choix mÃ©morisÃ©).
5. Pied de page > Â« Gestion des cookies Â» : le bandeau se rouvre.
6. Â« Personnaliser Â» : catÃ©gories NÃ©cessaires (active, non modifiable), Mesure d'audience (dÃ©sactivÃ©e), PublicitÃ© (dÃ©sactivÃ©e).
7. Activer Mesure d'audience, enregistrer : requÃªtes GA et cookies `_ga`, `_ga_*` apparaissent aprÃ¨s le choix.
8. VÃ©rifier la durÃ©e des cookies `_ga` (13 mois maximum).
9. Rouvrir Â« Gestion des cookies Â», Â« Refuser tout Â» : le suivi s'arrÃªte.
10. MÃªme parcours en `/en` : textes en anglais.
11. Sans `NEXT_PUBLIC_GA_ID` (environnement local) : aucun script chargÃ©. Lire les pages Cookies et ConfidentialitÃ© : description conforme (cookies, durÃ©e, transfert vers Google).

### T-COLIS â€” multi-colis et annulation
PrÃ©requis : Client connectÃ© ; articles de 2 crÃ©ateurs ; 2 comptes crÃ©ateurs actifs.
1. Panier avec 2 articles de 2 crÃ©ateurs : message Â« expÃ©diÃ©e en 2 colis, par 2 crÃ©ateurs diffÃ©rents, Ã  des dates diffÃ©rentes Â», Colis 1/2 et 2/2 avec Â« PrÃ©paration sous 2 jours ouvrÃ©s Â», aucune ligne de frais. Avec un seul crÃ©ateur : message au singulier.
2. MÃªme bloc sur la page de paiement ; payer.
3. Compte > Mes commandes > dÃ©tail : cartes Â« Colis 1 sur 2 Â» et Â« Colis 2 sur 2 Â», bouton Â« Annuler ma commande Â» sur chacune.
4. Cliquer le bouton : confirmation ; Annuler ne fait rien.
5. Confirmer : colis Â« AnnulÃ©e Â», mention de remboursement, commande globale non annulÃ©e.
6. VÃ©rifier les e-mails (client et crÃ©ateur).
7. CrÃ©ateur : passer l'autre colis Ã  Â« ExpÃ©diÃ© Â» : le bouton disparaÃ®t cÃ´tÃ© client, texte renvoyant au retour sous 30 jours ; mail Â« Colis 2 sur 2 Â».
8. Annuler les 2 colis : Â« Commande annulÃ©e Â» ; tous livrÃ©s : Â« Commande livrÃ©e Â».
9. Deux onglets : expÃ©dier dans l'un, annuler dans l'autre : aucune annulation.
10. Avec un autre compte client : impossible d'annuler un colis Ã©tranger. Pages Aide FR/EN : texte d'annulation Ã  jour.

### T-SUIVI â€” suivi de livraison et remboursement (lots 1â€“2)
PrÃ©requis : migration 0020 appliquÃ©e.
1. CrÃ©ateur : commande acceptÃ©e, formulaire d'expÃ©dition : choisir UPS, saisir un numÃ©ro, valider.
2. Mail Â« en route Â» : lien Â« Suivre mon colis Â» vers la page UPS avec le numÃ©ro.
3. Compte client, dÃ©tail de commande : lien Â« Suivre mon colis Â» prÃ©sent ; absent pour un transporteur Â« Autre Â».
4. Marquer livrÃ© : mail Â« livrÃ©e Â» avec le mÃªme lien.
5. Annuler un colis sans STRIPE_SECRET_KEY : Â« remboursement en cours de traitement Â», `refundStatus` = MANUAL en base.
6. Avec une clÃ© Stripe de test et `stripePaymentIntentId` posÃ© sur la commande : annulation = DONE, mail Â« remboursement effectuÃ© Â», visible dans Stripe.
7. ClÃ© invalide : FAILED, texte Â« en cours de traitement Â». Deux onglets : un seul remboursement.

### T-MAILS â€” e-mails clients
1. Passer une commande : e-mail Â« reÃ§ue Â» centrÃ©, logo, titre en majuscules, vignette (image visible : TESTÃ‰ le 10/11/2026), taille (Ã— 1 Â· M), total, adresse, aide, pied.
2. Marquer expÃ©diÃ© : e-mail Â« en route Â» avec bouton Â« Suivre ma commande Â», adresse, Â« Colis X sur N Â».
3. Marquer livrÃ© : bouton Â« Voir ma commande Â».
4. VÃ©rifier : aucune mention dÃ©mo/fictif/simulÃ©, pas de Â« Livraison : Offerte Â», nom propre du crÃ©ateur, rendu mobile.

### T-STRIPE â€” paiement Stripe (lot 0)
PrÃ©requis : migration 0021 appliquÃ©e ; clÃ©s Stripe de test ; webhook `/api/stripe/webhook` (Ã©vÃ©nement checkout.session.completed) dÃ©clarÃ© dans Stripe avec STRIPE_WEBHOOK_SECRET.
1. Sans STRIPE_SECRET_KEY : passer commande, confirmation et e-mails immÃ©diats comme avant.
2. Avec les clÃ©s : Client, panier, Â« Commander Â» : redirection vers la page Stripe, montant correct. â€” TESTÃ‰ 10/11/2026
3. Payer avec la carte de test 4242 4242 4242 4242 : retour sur la confirmation de commande. â€” TESTÃ‰ 10/11/2026
4. VÃ©rifier : e-mail Â« reÃ§ue Â» et notification au crÃ©ateur arrivent aprÃ¨s le paiement (webhook), une seule fois. â€” TESTÃ‰ 10/11/2026
5. En base : `stripePaymentIntentId` renseignÃ©, `paymentPending` = false. â€” TESTÃ‰ 10/11/2026
6. Abandonner sur la page Stripe : aucun e-mail envoyÃ©, commande en attente de paiement.
7. Annuler ensuite un colis payÃ© : remboursement Stripe automatique (voir T-SUIVI).
8. Webhook avec signature invalide (curl) : rÃ©ponse 400. â€” TESTÃ‰ 10/11/2026

### T-REMB â€” remboursement au refus / expiration / annulation
PrÃ©requis : migration 0022 ; STRIPE_SECRET_KEY de test ; commande payÃ©e via Stripe.
1. Client : commande payÃ©e (carte 4242â€¦), webhook reÃ§u (`stripePaymentIntentId` renseignÃ©). â€” TESTÃ‰ 10/11/2026
2. CrÃ©ateur : refuser le colis avec un motif. RÃ©sultat : Stripe > Paiements > Refund crÃ©Ã© (montant du colis), `refundStatus` = DONE. â€” TESTÃ‰ 10/11/2026
3. Compte client et e-mail Â« Commande annulÃ©e Â» (refus, expiration, annulation client/admin) : Â« Vous serez remboursÃ© de X,XX â‚¬ â€¦ sous 5 Ã  10 jours ouvrÃ©s Â» (FR et EN).
4. Refaire avec annulation client, puis annulation admin : mÃªme rÃ©sultat.
5. Colis sans rÃ©ponse 48 h (expirÃ©) : remboursement crÃ©Ã© au passage du cron.
6. Refuser un colis avant le webhook (paiement non confirmÃ©) : `refundStatus` = AWAITING ; renvoyer le webhook : remboursement crÃ©Ã©.
7. ClÃ© Stripe invalide : `refundStatus` = FAILED, `refundNote` explicite, ligne `[refund]` dans les logs Vercel ; e-mail et compte : message neutre Â« nous revenons vers vous Â», sans montant. Sans paiement Stripe : aucune mention de remboursement.
8. Commande AM-ECAD4CB3 : Ã  rattraper (voir handoff) ou nouvelle commande.

### T-AIDE â€” pages d'aide
1. Ouvrir `/fr/support/faq`, `orders`, `payment`, `returns`, `terms`, `privacy`, `cookies`, `contact` : contenu complet, menu latÃ©ral commun.
2. Widget Â« Ce contenu vous semble-t-il pertinent ? Â» : cliquer Oui puis Pas vraiment.
3. MÃªmes pages en `/en`. VÃ©rifier : retours par colis, signature transporteur, annulation depuis le compte, e-mail de contact inchangÃ©.

### T24 â€” parcours complet
1. Client : acheter 2 crÃ©ations (2 crÃ©ateurs), panier puis paiement.
2. CrÃ©ateurs : accepter, prÃ©parer, expÃ©dier (transporteur + suivi), livrer.
3. Client : suivre chaque colis, e-mails reÃ§us Ã  chaque Ã©tape.
4. Admin : voir les sous-commandes dans `/fr/admin/commandes` et le registre dans `/fr/admin/versements`.

### T-ADMIN-FILTRES â€” Filtres, pastilles et e-mails de retour â€” 20 min â€” Ã€ tester â€” date : â€”
Couvert en partie par A-F1, A-F2, A-F3 (logique, gabarit) ; reste le rendu visuel et la prise en main.
1. Compte admin : ouvrir Admin. RÃ©sultat : pastilles numÃ©rotÃ©es sur Candidatures, CrÃ©ations Ã  modÃ©rer, Commandes (escaladÃ©es), Versements (Ã  payer), Retours (demandÃ©s) quand il y a du travail ; aucune pastille Ã  0.
2. Admin â€º Retours : onglet Â« Ã€ traiter Â» par dÃ©faut avec son compteur ; cliquer Â« RemboursÃ©s Â», Â« RefusÃ©s Â», Â« Tous Â». RÃ©sultat : la liste change, l'URL contient `?st=â€¦`.
3. Retours : saisir un nÂ° de colis dans Â« Recherche Â», une pÃ©riode (Du/Au), cliquer Â« Filtrer Â». RÃ©sultat : seules les lignes correspondantes ; recharger la page conserve les filtres.
4. Admin â€º Commandes : dÃ©faut Â« Ã€ traiter Â» (sans rÃ©ponse / remboursement Ã  reprendre) ; tester onglets En cours, ExpÃ©diÃ©es, LivrÃ©es, AnnulÃ©es ; recherche par nÂ° de colis, nom ou e-mail du client, nom du partenaire.
5. Admin â€º Versements : dÃ©faut Â« Ã€ payer Â» ; onglets Â« En attente (dÃ©lai de retour) Â» et Â« Tous les partenaires Â» ; recherche partenaire ; historique des versements filtrÃ© par pÃ©riode.
6. Admin â€º Candidatures (dÃ©faut Â« Ã€ traiter Â») et Partenaires (dÃ©faut Â« Actifs Â») : onglets de statut, recherche nom/e-mail/pays/mÃ©tier, pÃ©riode.
7. Avec plus de 25 lignes (ou en rÃ©duisant le filtre), vÃ©rifier Â« Page 1 / n Â», Â« Suivant â†’ Â», Â« â† PrÃ©cÃ©dent Â» : 25 lignes par page, filtres conservÃ©s d'une page Ã  l'autre.
8. Compte partenaire : menu Espace partenaire â€º pastille sur Commandes (colis Ã  accepter/expÃ©dier) et CrÃ©ations (refusÃ©es) ; Commandes (dÃ©faut Â« Ã€ traiter Â»), Paiements (dÃ©faut Â« Disponibles Â») avec recherche, pÃ©riode et pagination.
9. Mobile : onglets de statut et formulaire de filtres lisibles, boutons â‰¥ 44 px, pas de dÃ©filement horizontal de la page.
10. E-mails de retour (voir T-RETOUR 2, 4, 5, 6) : logo Â« E PÃ“M TA' Â», titre en capitales, bouton noir, rÃ©capitulatif avec vignette (image visible), pied d'aide ; Gmail n'affiche plus Â« Ce message semble Ãªtre en anglais Â» sur un e-mail FR.

## Recette historique (lots A Ã  D, suspension, traduction, fiche crÃ©ation)

Chaque bloc ci-dessous est un test (ID H-xx) ; ses Ã©tapes sont numÃ©rotÃ©es. Statut de chaque test : Ã€ tester, sauf mention contraire.


### H-01 â€” Lot A â€” Candidature et validation admin
Statut : Ã€ tester â€” Date : â€”
URLs (remplacer `fr` par `en` pour l'anglais) : `/fr/fournisseur`, `/fr/fournisseur/candidature`, `/fr/admin/candidatures`, `/fr/admin/fournisseurs`, `/fr/account`.

1. Visiteur non connectÃ© sur `/fr/fournisseur/candidature` : invitÃ© Ã  se connecter.
2. Visiteur sur `/fr/fournisseur/tableau-de-bord` : redirigÃ© vers la connexion.
3. Client connectÃ© (non partenaire) sur le tableau de bord partenaire : redirigÃ© vers la candidature.
4. Client sur `/fr/admin` : renvoyÃ© Ã  l'accueil.
5. Client remplit et envoie la candidature : message Â« Candidature envoyÃ©e Â». **E-mail** de confirmation au candidat ; **e-mail** Ã  l'admin.
6. Renvoyer une 2e candidature en attente : message Â« dÃ©jÃ  en cours d'examen Â».
7. Candidature sans lien ET sans fichier : refusÃ©e avec message clair (Â« lien OU fichier Â»).
8. Candidature sans lien mais avec 1 Ã  5 fichiers (JPG/PNG/WebP/PDF, 4 Mo max chacun) : miniatures affichÃ©es, suppression possible, envoi acceptÃ©. Les erreurs sont explicites (trop lourd, format, session expirÃ©e, erreur serveur, code HTTP). PrÃ©requis Neon : migrations appliquÃ©es jusqu'Ã  `0010_application_files` (table `ApplicationFile`) ; sans elle l'envoi Ã©choue avec Â« Erreur du serveurâ€¦ Â».
9. Fichier .exe/.txt renommÃ© en .jpg, ou > 4 Mo : refusÃ©. 6e fichier : refusÃ©.
10. Admin : la fiche candidature montre les miniatures (clic = agrandi) et les PDF (tÃ©lÃ©chargeables) ; un autre client ne peut pas ouvrir ces fichiers.
11. Admin, `/fr/admin/candidatures` : la candidature apparaÃ®t Â« Ã€ traiter Â».
12. Admin Â« Demander des infos Â» (avec message) : statut mis Ã  jour ; **e-mail** au candidat ; le candidat voit la note et peut renvoyer.
13. Admin Â« Refuser Â» : **e-mail** de refus.
14. Admin Â« Accepter Â» : **e-mail** de bienvenue ; le candidat accÃ¨de Ã  `/fr/fournisseur/tableau-de-bord`.
15. Partenaire : modifier le profil (nom, pays, bio, vidÃ©o) puis recharger : valeurs conservÃ©es.
16. Admin, `/fr/account` : plus de bloc Â« Vue (admin) Â» ; l'accÃ¨s se fait par les lignes Â« Administration Â» / Â« Mon espace partenaire Â» de Â« Mon compte Â».
17. Admin : `/fr/admin/fournisseurs`, Â« Voir son espace Â» sur un partenaire de dÃ©mo : espace affichÃ© en lecture seule (bandeau Â« Vue admin Â»), Â« Quitter Â» ferme la vue.
18. Un admin ne peut pas ouvrir l'espace d'un vrai partenaire (seules les dÃ©mos sont proposÃ©es).


### H-02 â€” Lot B â€” CrÃ©ations et stock
Statut : Ã€ tester â€” Date : â€”

PrÃ©requis : `npm run db:seed-suppliers` (partenaires de dÃ©mo avec crÃ©ations, variantes et une crÃ©ation Ã  modÃ©rer) ; `npm run db:check-stock` (vÃ©rification automatique du stock, dont la concurrence sur la derniÃ¨re piÃ¨ce). Variable Vercel optionnelle : `BLOB_READ_WRITE_TOKEN` (non utilisÃ©e pour l'instant : photos stockÃ©es en base, â‰¤ 300 Ko ; interface `PhotoStorage` dans `src/lib/storage.ts` Ã  brancher sur Vercel Blob).

Comptes : partenaire actif (acceptÃ© au lot A), admin (`ADMIN_EMAILS`), client.


#### H-03 â€” Partenaire â€” `/fr/fournisseur/oeuvres`
Statut : Ã€ tester â€” Date : â€”
1. Menu Â« CrÃ©ations et stock Â» ; liste vide au dÃ©but ; bouton Â« Ajouter une crÃ©ation Â».
2. Nouvelle crÃ©ation : titres FR/EN, description (â‰¥ 20 car. pour soumettre), catÃ©gorie, prix + devise (XOF, XAF, USDâ€¦), dimensions, poids, 1 Ã  6 photos (compressÃ©es auto, 1re = couverture, suppression possible).
3. Stock initial : quantitÃ©, case Â« PiÃ¨ce unique Â» (= 1), ou variantes (Â« S: 3 Â» une par ligne).
4. CatÃ©gorie peinture/sculpture/photographie : bloc facultatif Ã‰dition, photo de signature, case Â« Je certifie Ãªtre l'auteur Â» (horodatÃ©e). Aucun bloc pour la mode.
5. Â« Enregistrer le brouillon Â» â†’ statut Brouillon ; Â« Enregistrer et soumettre Â» â†’ En modÃ©ration. E-mail attendu cÃ´tÃ© admin (Â« CrÃ©ation Ã  modÃ©rer Â»).
6. Profil : signature dessinÃ©e ou tÃ©lÃ©versÃ©e, enregistrÃ©e une seule fois.
7. Fiche crÃ©ation, section Stock : entrÃ©e de stock, correction (refusÃ©e si elle passe sous le rÃ©servÃ©), nouvelle variante ; historique des mouvements avec date, type, quantitÃ©, motif, auteur.
8. Un partenaire ne voit/modifie jamais les crÃ©ations d'un autre (URL directe â†’ 404).


#### H-04 â€” Admin â€” `/fr/admin/oeuvres`
Statut : Ã€ tester â€” Date : â€”
1. File des crÃ©ations soumises avec photos, prix, stock, attestation/Ã©dition ; Â« Publier Â» ou Â« Refuser Â» (motif obligatoire). E-mail au partenaire dans les deux cas.
2. Admin `/fr/admin/oeuvres` : onglets En attente (dÃ©faut) / PubliÃ©es / RefusÃ©es / Toutes avec compteurs ; chaque crÃ©ation montre badge de statut, partenaire, date de dÃ©cision et motif si refusÃ©e ; Publier/Refuser seulement en attente, Refuser (motif) possible sur une publiÃ©e ; une crÃ©ation traitÃ©e ne disparaÃ®t plus. CÃ´tÃ© partenaire `/fr/fournisseur/oeuvres` : badges Â« En modÃ©ration Â», Â« PubliÃ©e Â», Â« RefusÃ©e Â» (+ motif). Migration additive 0016 (`Product.decidedAt`) Ã  appliquer sur Neon.
3. Admin saisit au nom d'un partenaire : `/fr/admin/fournisseurs` â†’ bouton Â« GÃ©rer les crÃ©ations Â» visible seulement pour un partenaire ACTIF non dÃ©mo (absent si suspendu/rÃ©voquÃ©) â†’ liste de ses crÃ©ations â†’ Â« Nouvelle crÃ©ation au nom du partenaire Â» : mÃªme formulaire, boutons Brouillon / Â« Envoyer en modÃ©ration Â» / Â« Publier directement Â» (publiÃ©e = visible au catalogue, date de dÃ©cision renseignÃ©e). CrÃ©ation marquÃ©e Â« Saisie par l'administration Â» (liste du partenaire et `/admin/oeuvres`) ; historique de stock : Â« Stock initial â€” crÃ©Ã© par l'admin pour le compte de <partenaire> Â» (auteur = e-mail admin). Section art : signature/attestation non proposÃ©es Ã  l'admin, le partenaire les complÃ¨te dans son espace. La crÃ©ation est visible et modifiable dans `/fr/fournisseur/oeuvres` (photos saisies par l'admin conservÃ©es) ; commission 15 %, stock et commandes inchangÃ©s. Un non-admin qui poste `asSupplier` est redirigÃ© (droits : ADMIN_EMAILS). Migration additive 0017 (`Product.createdByAdmin`) Ã  appliquer sur Neon.
4. Admin `/fr/admin/oeuvres` en tableaux (25/page) : onglets En attente / PubliÃ©es / RefusÃ©es / Toutes avec compteurs qui respectent les filtres ; colonnes photo, partenaire, crÃ©ation, catÃ©gorie, prix (â‚¬), stock, description tronquÃ©e (infobulle), statut, dÃ©cision (jj/mm/aaaa hh:mm, Â« â€” Â» si absente), motif (RefusÃ©es/Toutes), badge Â« Saisie par l'administration Â», actions. Filtre date (dÃ©faut Aujourd'hui, 7 j, 30 j, plage, Toutes les dates = inclut dÃ©cisions sans date) ; En attente n'est jamais filtrÃ© par date (sÃ©lecteur grisÃ© avec explication), et Â« Toutes Â» = en attente + publiÃ©es/refusÃ©es filtrÃ©es par date (compteur Toutes = somme des trois) ; message Â« N crÃ©ation(s) masquÃ©e(s) par le filtre de date Â» + lien Â« Voir toutes les dates Â» (dÃ©cisions sans date incluses). Recherche, partenaire, catÃ©gorie, tri (partenaire, prix, dÃ©cision) conservÃ©s dans l'URL ; Export CSV de la vue filtrÃ©e (admin uniquement, 403 sinon) ; cases + Â« Publier/Refuser la sÃ©lection Â» avec motif commun (refus sans motif refusÃ©) ; Ã©tat vide ; dÃ©filement horizontal Ã  390 px ; journal de stock paginÃ©. Clic sur la photo = visionneuse (Ã‰chap, clic extÃ©rieur, bouton Ã—, prÃ©cÃ©dent/suivant, balayage tactile), aussi dans `/fr/fournisseur/oeuvres`.
5. Admin `/fr/admin/oeuvres` colonne Â« En attente depuis Â» (En attente et Toutes) : date/heure de soumission + durÃ©e (Â« 2 h Â», Â« 3 j Â»), orange > 24 h, rouge > 72 h (constantes `WAIT_WARN_H`/`WAIT_ALERT_H`), tri par colonne (dÃ©faut En attente : plus ancienne d'abord), Â« la plus ancienne en attente : X Â» en tÃªte, colonnes dans le CSV. Migration 0018 (backfill `submittedAt = createdAt`) Ã  appliquer sur Neon.
6. Filtre de date : Du/Au reflÃ¨tent la pÃ©riode (Aujourd'hui = jour/jour ; 7 jours = aujourd'huiâˆ’6 â†’ aujourd'hui ; 30 jours idem ; Toutes les dates = champs vides) ; changer le sÃ©lecteur met Ã  jour Du/Au sans rechargement puis applique le filtre ; modifier Du ou Au bascule sur Â« Plage personnalisÃ©e Â» ; Du > Au = message d'erreur (champs bornÃ©s min/max, URL inversÃ©e corrigÃ©e cÃ´tÃ© serveur) ; bornes en heure de Europe/Paris.
7. Liens vers la fiche : sur /admin/oeuvres, le titre d'une crÃ©ation publiÃ©e ouvre /produits/<slug> dans un nouvel onglet (â†—, info-bulle Â« Ouvrir la fiche publique Â») ; en attente/refusÃ©e = texte + lien Â« Voir cÃ´tÃ© partenaire Â» ; mÃªme lien dans le journal de stock et dans Â« CrÃ©ations et stock Â» (publiÃ©es seulement).
8. Barre admin sur la fiche publique (visible uniquement pour un admin) : Retour Ã  la modÃ©ration / Refuser / Modifier.
9. Plage personnalisÃ©e avec seulement Du : les dÃ©cisions sans date (avant 0016) n'apparaissent pas ; elles n'apparaissent que sous Â« Toutes les dates Â».
10. URL propre (migration 0019 Ã  appliquer sur Neon) : la page boutique d'un partenaire est /partenaires/<nom-nettoyÃ©> (ex. /fr/partenaires/lolipat), suffixe -xxxx seulement en cas de doublon. Anciennes URL : /fr/createurs/... â†’ 308 vers /fr/partenaires/... ; un ancien slug renommÃ© (ex. lolipat-341c) â†’ 308 vers le nouveau slug (table CreatorSlugAlias). Les liens du menu, pied de page, accueil, catalogue, recherche et fiches pointent sur /partenaires.
11. Photo de profil : Espace partenaire > Profil > Â« Photo de profil Â» (â‰¤ 300 Ko) ; aprÃ¨s enregistrement, elle s'affiche sur la page boutique, les cartes et l'accueil. Sans photo : mÃ©daillon dorÃ© avec les initiales (ex. Â« LP Â»).
12. Espace partenaire > CrÃ©ations et stock = tableau (photo+lightbox, crÃ©ation avec â†— si publiÃ©e, catÃ©gorie, prix â‚¬, stock, statut, motif de refus, Â« En attente depuis Â» orange > 24 h / rouge > 72 h, dÃ©cision, Modifier / Ajuster le stock). Onglets avec compteurs : Toutes / En modÃ©ration / PubliÃ©es / RefusÃ©es / Brouillons / Stock bas ; recherche, catÃ©gorie, statut, tri par colonne, pagination 25, Export CSV (mes-creations.csv) de la vue filtrÃ©e. VÃ©rifier qu'un partenaire ne voit jamais les crÃ©ations d'un autre (liste, CSV, journal). Journal de stock du partenaire paginÃ©. Mobile 390 px : dÃ©filement horizontal.
13. Lot 3 quater : (101) une commande dont les crÃ©ations n'ont pas de partenaire (crÃ©ations d'exemple) apparaÃ®t dans Admin > Commandes, section Â« Commandes sans partenaire (crÃ©ations d'exemple) Â» (ex. AM-BF63AC79) ; (102) Â« Mes commandes Â» : une commande sans partenaire reste Â« ConfirmÃ©e Â» (plus de statut simulÃ© Â« En prÃ©paration Â»), les commandes avec partenaire affichent les statuts des sous-commandes ; (103) Â« 1 article Â» / Â« 2 articles Â» (singulier/pluriel).
14. Lot 3 ter bis : (99) Â« Pays / RÃ©gion Â» : sÃ©lecteur avec drapeaux SVG, recherche, FR/CM/BE/CI en tÃªte (checkout, carnet d'adresses, adresse de commande) ; la valeur envoyÃ©e reste le nom du pays ; (100) tÃ©lÃ©phone invalide : message rouge intÃ©grÃ© sous le champ (plus d'infobulle navigateur), contour rouge, persistant tant que le numÃ©ro est invalide ; l'envoi reste bloquÃ©.
15. Lot 3 ter : Â« Publier Â» d'une seule crÃ©ation refusÃ©e (admin) : Confirmer publie bien (message Â« CrÃ©ation publiÃ©e. Â») ; Â« Annuler et libÃ©rer le stock Â» (liste et dÃ©tail) : motif saisi dans la fenÃªtre bien transmis ; Â« Enregistrer et renvoyer en modÃ©ration Â» (partenaire) : Confirmer enregistre.
16. Lot 3 bis : (63-65) tÃ©lÃ©phone : sÃ©lecteur plus grand, drapeaux SVG, liste de pays recherchable (France, Cameroun, Belgique, CÃ´te d'Ivoire en tÃªte), champ toujours en numÃ©ro national formatÃ© (Â« 6 68 97 30 76 Â») ; (66/68) affichage Â« +33 6 68 97 30 76 Â» (rÃ©capitulatif, dÃ©tail commande admin/partenaire, adresses) ; (67) message de validation du tÃ©lÃ©phone en franÃ§ais ; (58) Â« Plus que N Â» lisible sur la taille sÃ©lectionnÃ©e ; (59) Â« Ajouter au panier Â» rÃ©activÃ© aprÃ¨s changement de taille/quantitÃ© ; (52/82) Â« CrÃ©ation publiÃ©e. Â» / Â« CrÃ©ation refusÃ©e. Â» aprÃ¨s action admin.
17. Lot 3 (partiel) : (51/79) confirmations dans une fenÃªtre du site Â« Confirmer / Annuler Â» (plus de confirm() natif) ; (69/71) Â« Annuler et libÃ©rer le stock Â» â†’ fenÃªtre Â« Annuler cette commande ? Â» avec motif obligatoire, champ retirÃ© de la liste ; (70) lignes de commandes avec Â« â€º Â» ; (73) historique Â« Commande annulÃ©e par l'administration â€” motif : â€¦ Â» ; (81) Â« En attente depuis moins d'1 h Â».
18. Lot F34-2 : (33) bloc Â« AuthenticitÃ© Â» sur la fiche (date, Ã©dition, signature agrandissable) seulement si attestation ; (9) lignes vides masquÃ©es ; (10) taille/variante dans le panier ; (11) sÃ©lecteur âˆ’ 1 + plafonnÃ© au stock, Â« Plus que N Â» (â‰¤3) ; (12) tÃ©lÃ©phone avec indicatif (adresses, checkout) E.164 ; (13) plus de texte Â« simulÃ©s Â» dans Mes commandes ; (14) dÃ©tail admin d'une commande (clic sur le numÃ©ro) ; (19) pas de modification d'adresse si commande annulÃ©e/expÃ©diÃ©e ; (34) en-tÃªte non collant en mobile ; (35) journal et tableau partenaire en cartes en mobile ; (8) colonne Â« Variante Â» du journal ; (37) Â« Nouveau Â» = moins de 60 jours.
19. Lot F34 (partiel) : (1) admin : Â« Publier Â» avec confirmation sur une crÃ©ation refusÃ©e, cases Ã  cocher actives sur les refusÃ©es ; (3) renvoi en modÃ©ration efface la date de dÃ©cision ; (5/7) erreurs de stock Â« Le motif est obligatoire Â» / Â« QuantitÃ© invalide Â», libellÃ© Â« Correction (+/âˆ’) Â» partout ; (6) onglet Â« Ã‰puisÃ©es Â» distinct de Â« Stock bas Â» (partenaire) ; (16) alerte stock bas basÃ©e sur la somme des variantes ; (17) stock par taille Â« S 2 Â· M 1 Â» dÃ©pliable dans le tableau partenaire ; (21) modifier une crÃ©ation publiÃ©e cÃ´tÃ© partenaire â†’ avertissement + Â« En modÃ©ration Â» (admin : reste publiÃ©e) ; (22) badge Â« Saisie par l'administration Â» cÃ´tÃ© partenaire ; (23) e-mails Â« CrÃ©ation retirÃ©e du catalogue : {titre} Â» / Â« CrÃ©ation Ã  revoir : {titre} Â» ; (24-26) tris, filtre Statut admin ; (29-30) CSV en franÃ§ais, heure de Paris ; (31) recherche Â« bague Â» insensible casse/accents ; (36) Â« Du Â» seul n'exclut/n'ajoute pas Â« Au Â» et masque les dÃ©cisions sans date ; (40) curseur main sur tout Ã©lÃ©ment cliquable ; (41) photo de profil > 300 Ko refusÃ©e (Â« Photo trop lourde (max 300 Ko). Â») ; (42-44) nom de partenaire unique (casse/accents/espaces), Â« Ce nom est dÃ©jÃ  utilisÃ© par un partenaire. Â» ; (47) bouton Â« Choisir des fichiers Â» + compteur ; (48-49) page admin Â« CrÃ©ations de {partenaire} Â» : message vide + e-mail ; (32 bis) alerte Â« Ajoutez l'attestation pour valoriser votre Å“uvre. Â» sur les crÃ©ations d'art publiÃ©es sans attestation.
20. Terminologie : Â« Å“uvre Â» est remplacÃ© par Â« crÃ©ation Â» partout dans l'UI, les e-mails, le CSV (`creations.csv`) et cette recette (FR) ; Â« Creation(s) Â» en EN ; URL `/oeuvres` inchangÃ©es ; Â« Å“uvre d'art Â» conservÃ© pour l'authenticitÃ©/signature ; Â« PiÃ¨ce unique Â» inchangÃ©.
21. CrÃ©ation publiÃ©e â†’ visible dans le catalogue et sur la fiche de l'artiste ; refusÃ©e â†’ corrigeable puis re-soumettable ; dans la liste `/fr/fournisseur/oeuvres`, le motif du refus s'affiche sous le badge Â« RefusÃ©e Â» (2 lignes max, rouge discret).
22. Derniers mouvements de stock visibles.


#### H-05 â€” Client
Statut : Ã€ tester â€” Date : â€”
1. Fiche produit : Â« PiÃ¨ce unique Â» (stock 1), Â« Plus que 2/3 Â», Â« En stock Â», Â« Ã‰puisÃ© Â» (non achetable) ; variantes Ã©puisÃ©es barrÃ©es.
2. Achat de la derniÃ¨re piÃ¨ce : le stock est rÃ©servÃ© (disponible 0, crÃ©ation Â« Ã‰puisÃ© Â» en catalogue) ; un second client reÃ§oit une erreur de stock.
3. Stock bas : aprÃ¨s l'achat, e-mail Â« stock bas Â» au partenaire si le disponible passe sous son seuil.
4. Confirmation Ã  l'expÃ©dition, libÃ©ration au refus/expiration/annulation, retour de stock : lot C.


### H-06 â€” Suspension / rÃ©vocation d'un partenaire (`/fr/admin/fournisseurs`)
Statut : Ã€ tester â€” Date : â€”
Migration additive 0012 (`PartnerAudit`). Les partenaires de dÃ©mo ne sont pas concernÃ©s.
1. Admin : sur un vrai partenaire, une seule ligne : champ Â« Motif Â» + liste Â« Action Â» (Actif : Suspendre/RÃ©voquer ; Suspendu : RÃ©activer/RÃ©voquer) + Â« Valider Â». Sans motif (Suspendre/RÃ©voquer) â†’ blocage du formulaire ; avec motif â†’ popup Â« Confirmer la suspension ? Â» (Oui/Non) ; Â« Non Â» n'exÃ©cute rien ; Â« Oui Â» â†’ statut Suspendu, e-mail au partenaire, entrÃ©e au journal d'audit.
2. Chaque ligne affiche Â« Partenaire depuis le JJ/MM/AAAA Â» ; le journal (tableau date, partenaire, action, motif, auteur), groupÃ© par partenaire en ordre chronologique, contient Â« CrÃ©ation du compte partenaire (candidature acceptÃ©e) Â» (y compris pour les anciens), puis chaque Suspension, RÃ©activation, RÃ©vocation avec date/heure, motif et auteur.
3. `/fr/fournisseur/candidature` : pour un partenaire existant (actif, suspendu ou rÃ©voquÃ©) le titre est Â« Mon espace partenaire Â» (EN Â« My partner space Â») et aucun formulaire de candidature n'apparaÃ®t ; Â« Candidature partenaire Â» + formulaire uniquement pour un utilisateur sans partenaire.
4. `/fr/account` : en tÃªte de Â« Mon compte Â», une ligne Â« Mon espace partenaire Â» (â€º) pour un partenaire actif, suspendu ou rÃ©voquÃ© (suspendu â†’ message de suspension) et une ligne Â« Administration Â» (â€º) pour les ADMIN_EMAILS ; un client simple ne voit ni l'une ni l'autre. FR/EN, mobile 390 px et bureau.
5. Partenaire suspendu : `/fr/fournisseur` et le tableau de bord mÃ¨nent Ã  la page candidature avec Â« Votre espace partenaire est suspendu. Â», le motif et un lien Â« Contactez-nous Â», sans Â« Y accÃ©der Â» ; portail bloquÃ©. Idem Â« Votre accÃ¨s partenaire a Ã©tÃ© rÃ©voquÃ©. Â» aprÃ¨s rÃ©vocation. FR/EN, lisible Ã  390 px. AprÃ¨s rÃ©activation : Â« Votre espace partenaire est ouvert. Y accÃ©der Â» et accÃ¨s normal.
6. Partenaire suspendu : `/fr/fournisseur` n'ouvre plus le portail ; ses crÃ©ations publiÃ©es disparaissent du catalogue (statut Â« MasquÃ©e Â»).
7. Â« RÃ©activer Â» (motif facultatif, popup Â« Confirmer la rÃ©activation ? Â») : accÃ¨s et crÃ©ations rÃ©tablis, e-mail envoyÃ©.
8. Â« RÃ©voquer dÃ©finitivement Â» : motif obligatoire, popup Â« Confirmer la rÃ©vocation dÃ©finitive ? Â» avec case Â« Anonymiser le profil Â» (dÃ©cochÃ©e par dÃ©faut) ; refusÃ© tant qu'une crÃ©ation a du stock rÃ©servÃ© (commande en cours) ; anonymisation : nom, bio, vidÃ©o, signature effacÃ©s ; commandes et paiements conservÃ©s. Aucune suppression physique.


### H-07 â€” Lot C â€” Commandes par partenaire
Statut : Ã€ tester â€” Date : â€”
Migration additive 0013 (`SubOrder`, `OrderItem.subOrderId`). VÃ©rification automatique : `npm run db:check-orders` (scission, autorisations, 48 h, relance/escalade/expiration, libÃ©ration et confirmation du stock). Variables : `CRON_SECRET` (cron `/api/orders/sweep`, quotidien sur Vercel Hobby ; le balayage tourne aussi au chargement des pages Commandes et aprÃ¨s chaque commande), `ADMIN_EMAILS`, e-mail existant.
Comptes : client (ou invitÃ©), partenaire actif (ex. compte acceptÃ© au lot A avec une crÃ©ation publiÃ©e au lot B), admin (`ADMIN_EMAILS`).


#### H-08 â€” Client â€” achat
Statut : Ã€ tester â€” Date : â€”
1. Acheter 2 crÃ©ations de 2 partenaires diffÃ©rents (panier â†’ paiement test). Page de confirmation et `/fr/account/orders/<nÂ°>` : un bloc Â« Vendu et expÃ©diÃ© par [boutique] (pays) Â» par partenaire, Ã©tat Â« Ã€ accepter Â», mention Â« E pÃ³m taâ€™ est l'intermÃ©diaire Â».
2. Stock : la crÃ©ation est rÃ©servÃ©e (disponible âˆ’1). E-mail Â« nouvelle commande Â» Ã  chaque partenaire (Ã©chÃ©ance 48 h).


#### H-09 â€” Partenaire â€” `/fr/fournisseur/commandes`
Statut : Ã€ tester â€” Date : â€”
1. Tableau de bord : compteurs Â« Ã€ accepter Â», Â« Ã€ prÃ©parer / expÃ©dier Â», Â« En livraison Â». Liste filtrable (Ã€ accepter, Ã€ expÃ©dier, ExpÃ©diÃ©es, ClÃ´turÃ©es) ; un partenaire ne voit que ses sous-commandes (URL d'un autre â†’ 404).
2. Ouvrir la commande : articles, adresse de livraison, Ã©chÃ©ance. Â« Accepter Â» â†’ Ã©tat AcceptÃ©e, e-mail au client.
3. Â« Marquer en prÃ©paration Â» puis Â« Marquer expÃ©diÃ©e Â» : transporteur et suivi obligatoires. Stock confirmÃ© (mouvement Â« Vente Â» dans l'historique de la crÃ©ation, stock physique âˆ’1, rÃ©servÃ© âˆ’1). E-mail au client avec le suivi.
4. Â« Marquer livrÃ©e Â» â†’ e-mail au client ; le client voit Â« LivrÃ©e Â».
5. Refus : refuser avec motif (obligatoire) â†’ commande annulÃ©e, stock libÃ©rÃ© (mouvement Â« LibÃ©ration Â»), e-mail au client. La piÃ¨ce unique redevient achetable.


#### H-10 â€” 48 h, relance, escalade
Statut : Ã€ tester â€” Date : â€”
1. Sans rÃ©ponse : relance e-mail au partenaire Ã  24 h, e-mail d'escalade aux admins Ã  36 h (et badge Â« Sans rÃ©ponse Â» dans `/fr/admin/commandes`), annulation automatique Ã  48 h (stock libÃ©rÃ©, client prÃ©venu). Pour tester sans attendre : `npm run db:check-orders` simule ces dÃ©lais ; en manuel, appeler `/api/orders/sweep` avec `Authorization: Bearer <CRON_SECRET>`.


#### H-11 â€” Admin â€” `/fr/admin/commandes`
Statut : Ã€ tester â€” Date : â€”
1. Toutes les sous-commandes avec boutique, Ã©tat, suivi. Â« Annuler et libÃ©rer le stock Â» (motif obligatoire) sur une commande non expÃ©diÃ©e â†’ client prÃ©venu.
2. Suspension/rÃ©vocation : la rÃ©vocation est refusÃ©e tant que le partenaire a des commandes ouvertes.
3. Â« Voir comme Â» un partenaire de dÃ©mo : commandes en lecture seule.

Limites : paiement = test (aucun dÃ©bit) ; retour/litige et retour de stock aprÃ¨s livraison au lot E ; e-mails partenaires en franÃ§ais.


### H-12 â€” Traduction automatique des crÃ©ations
Statut : Ã€ tester â€” Date : â€”

Une seule saisie (titre + description) dans la langue choisie (Â« Langue de saisie Â», dÃ©faut = langue de l'interface) ; l'autre langue est traduite Ã  l'enregistrement.
1. `/fr/fournisseur/oeuvres/nouvelle` : un seul titre / une seule description + sÃ©lecteur de langue. Enregistrer.
2. Sans clÃ© (ou quota DeepL atteint, ou erreur) : l'enregistrement rÃ©ussit, aucune traduction, aucun message ; le texte d'origine s'affiche dans les deux langues, sans badge.
3. Avec clÃ© : badge Â« traduit automatiquement Â» ; corriger la version de l'autre langue puis enregistrer â†’ badge disparu (version manuelle conservÃ©e aux enregistrements suivants).
4. Modifier le titre/la description source â†’ l'autre langue est retraduite (sauf correction manuelle simultanÃ©e).
5. Une panne du service de traduction ne bloque jamais l'enregistrement.
- Variable Vercel (optionnelle) : `DEEPL_API_KEY` (DeepL API Free, endpoint api-free.deepl.com ; `DEEPL_API_URL` pour surcharger). Sans elle, pas de traduction.
- VÃ©rif : `npm run db:check-translate`. Limite : bio du profil non traduite automatiquement.


### H-13 â€” Fiche crÃ©ation d'un partenaire rÃ©el
Statut : Ã€ tester â€” Date : â€”

1. `/fr/produits/<slug>` d'une crÃ©ation publiÃ©e par un partenaire : pas de Â« Prix fictif de dÃ©monstration Â», dimensions sans mention Â« fictives Â», Â« PiÃ¨ce unique Â» affichÃ© une seule fois (pas de Â« Ã‰dition PiÃ¨ce unique Â»), section Â« Ã€ propos de la crÃ©ation Â» absente si l'histoire est vide.
2. Les piÃ¨ces du catalogue de dÃ©mo historique (Â« exemple-â€¦ Â») gardent leurs mentions de dÃ©monstration.


### H-14 â€” Lot D â€” Paiements (test)
Statut : Ã€ tester â€” Date : â€”

Mode test : aucun argent rÃ©el n'est encaissÃ© ni versÃ© (mention visible sur les pages Paiements / Versements). Le vendeur est la boutique ; la plateforme prÃ©lÃ¨ve sa commission.
Registre crÃ©Ã© Ã  la livraison (Â« Marquer livrÃ©e Â») : montant client = part boutique + commission (taux du partenaire, 15 % par dÃ©faut ; modifiable par l'admin, appliquÃ© aux prochaines livraisons). Gain Â« en attente Â» pendant `LEDGER_HOLD_DAYS` jours (dÃ©faut 7, fenÃªtre de retour), puis Â« disponible Â», puis Â« versÃ© Â».


#### H-15 â€” Partenaire â€” `/fr/fournisseur/paiements`
Statut : Ã€ tester â€” Date : â€”
1. AprÃ¨s une livraison : 3 cartes En attente / Disponible / VersÃ© ; tableau des ventes avec montant client, commission (âˆ’x â‚¬, taux) et Â« Votre part Â».
2. Mention Â« Paiement test : aucun argent rÃ©el Â».


#### H-16 â€” Admin â€” `/fr/admin/versements`
Statut : Ã€ tester â€” Date : â€”
1. Le partenaire apparaÃ®t avec ses soldes. Bouton Â« Rendre disponible (test) Â» sur un gain en attente (Ã©vite d'attendre 7 jours).
2. Â« Marquer le versement effectuÃ© Â» â†’ solde disponible versÃ©, rÃ©fÃ©rence TEST-â€¦, e-mail au partenaire (Â« versement effectuÃ© (test) Â»).
3. Re-cliquer sans solde â†’ Â« Aucun solde disponible Ã  verser Â».
4. Changer la commission (ex. 25 %) â†’ s'applique aux livraisons suivantes (les entrÃ©es existantes gardent leur taux).
5. CÃ´tÃ© partenaire : la ligne passe Ã  Â« VersÃ© Â» et le versement apparaÃ®t dans Â« Versements Â».

- Variable Vercel optionnelle : `LEDGER_HOLD_DAYS` (0 pour disponible immÃ©diatement). Migration 0015 additive (LedgerEntry, Payout).
- VÃ©rif : `npm run db:check-orders` (inclut commission 15 %, attenteâ†’disponibleâ†’versÃ©, idempotence, versements concurrents).
- Limites : pas de remboursement/retour (Ã©criture annulÃ©e au lot E : champ `reversedAt` prÃ©vu) ; taux unique par partenaire ; pas d'export/facture (lot H).

### T-CONTACT â€” Pied de page Â« Contactez-nous Â» â€” 3 min â€” Ã€ tester â€” date : â€”
1. Ouvrir epomta.com (Ã©cran large), descendre au pied de page. RÃ©sultat : une seule carte E-mail Â« contact@epomta.com Â», aucune carte tÃ©lÃ©phone tant que CONTACT_PHONE_LOCAL / CONTACT_PHONE_INTL ne sont pas dÃ©finies sur Vercel.
2. Pages Aide, CGV, ConfidentialitÃ© : l'adresse affichÃ©e est contact@epomta.com.

### T-COLIS-REMB â€” Page commande aprÃ¨s remboursement â€” 3 min â€” Ã€ tester â€” date : â€”
1. Compte client â€º Mes commandes, colis au retour remboursÃ©. RÃ©sultat : seul le statut du retour s'affiche, plus de Â« vous pouvez le retourner sous 30 jours Â» ni de formulaire.

### T-FILTRES-RESET â€” RÃ©initialiser et Versements â€” 5 min â€” Ã€ tester â€” date : â€”
1. Sur Admin â€º Commandes (puis Versements, Retours, Candidatures, Partenaires ; partenaire â€º Commandes, Paiements), saisir une recherche et des dates, Filtrer, puis Â« RÃ©initialiser Â». RÃ©sultat : champs vides, onglet de statut conservÃ©.
2. Admin â€º Versements : le texte d'aide du cycle s'affiche sous le titre ; le bouton Â« Rendre disponible maintenant (ignorer le dÃ©lai de retour) Â» demande confirmation (Annuler = rien ne change).

### T-STOCK-UNIQUE â€” Message de stock unique â€” 2 min â€” Ã€ tester â€” date : â€”
1. Ouvrir une fiche Å“uvre avec 2 exemplaires, sans taille (ex. /fr/produits/bague-de-marquis-argent-925-355e). RÃ©sultat : une seule ligne Â« Plus que 2 Â» (sous la description), pas de doublon rouge prÃ¨s du bouton.
2. Fiche avec tailles : l'indication Â« Plus que n Â» reste sur la taille concernÃ©e uniquement.

### T-MONTANT-EN â€” Montants et exemple de commande â€” 3 min â€” TestÃ© â€” 12/11/2026
1. Annuler un colis avec un compte en anglais (/en). RÃ©sultat : l'e-mail Â« Order cancelled Â» indique Â« â‚¬55.00 Â» (pas Â« 55,00 â‚¬ Â»).
2. Pages d'aide Contact FR et EN : l'exemple de nÂ° de commande est Â« AM-1A2B3C4D Â».

### T-DOMAINE â€” Retour Stripe sur le mÃªme domaine â€” 5 min â€” TestÃ© â€” 12/11/2026
1. Se connecter en client sur https://epomta-demo.vercel.app, commander (carte test Stripe 4242 4242 4242 4242). RÃ©sultat : retour sur epomta-demo.vercel.app/fr/checkout/confirmation/â€¦, toujours connectÃ©.
2. MÃªme parcours sur https://epomta.com : retour sur epomta.com.
3. Sur epomta-demo.vercel.app, ouvrir le compte client : plus d'erreur /api/auth/error?error=Configuration (sinon voir variables Vercel : AUTH_URL).

### T-RACHAT-LIEN â€” Racheter un article annulÃ© via son lien â€” 5 min â€” TestÃ© â€” 12/11/2026
1. Annuler une commande en tant que client, ouvrir l'e-mail Â« Commande annulÃ©e Â» : cliquer le nom d'un article â†’ fiche produit (FR et EN selon la langue).
2. Sur /fr/account/orders/<numÃ©ro> : les noms dans Â« Suivi par boutique Â» et Â« Articles Â» sont des liens vers la fiche.
3. Pour une piÃ¨ce vendue ou en rupture : le lien ouvre quand mÃªme la fiche, qui indique l'indisponibilitÃ©.
(Lien e-mail couvert par A-F12.)

### T-DOMAINE-OFFICIEL â€” Parcours complet sur epomta.com â€” 15 min â€” Ã€ tester â€” date : â€”
1. Sur https://epomta.com : inscription/connexion client, ajout panier, paiement Stripe (carte test) â†’ retour sur epomta.com, toujours connectÃ©.
2. Ouvrir les e-mails reÃ§us : tous les liens (compte, suivi, articles) pointent vers epomta.com.
3. Connexion Google : OK (aprÃ¨s mise Ã  jour de l'URI de redirection).
4. Webhook Stripe : la commande passe Ã  payÃ©e sans action manuelle.
(epomta-demo.vercel.app reste rÃ©servÃ© aux tests ; liste blanche couverte par A-F11.)

### T-MUR-EPOMTA â€” Mur d'accÃ¨s sur epomta.com â€” 3 min â€” TestÃ© â€” 12/11/2026
1. Navigation privÃ©e, ouvrir https://epomta.com puis https://www.epomta.com : la page de mot de passe s'affiche (aucune Å“uvre visible).
2. Ouvrir https://epomta.com/robots.txt : Â« Disallow: / Â».
3. Saisir le mot de passe : accÃ¨s au site ; refaire sur epomta-demo.vercel.app : le mot de passe est redemandÃ© (cookie propre Ã  chaque domaine).
(Couvert aussi par A-F13.)

### T-AUTRE-EN â€” Transporteur Â« Autre Â» en anglais â€” 3 min â€” Ã€ tester â€” date : â€”
1. Partenaire : expÃ©dier un colis avec transporteur Â« Autre Â».
2. Client en EN : ouvrir l'e-mail Â« on its way Â» et la page commande.
3. Attendu : Â« Other Â», pas Â« Autre Â». (Couvert en partie par A-F14.)

### T-IMG-EXEMPLE â€” Image d'exemple dans les e-mails â€” 3 min â€” Ã€ tester â€” date : â€”
1. Passer commande d'une piÃ¨ce exemple (lunettes), puis l'annuler.
2. Ouvrir les e-mails de confirmation et d'annulation.
3. Attendu : l'image s'affiche (mur d'accÃ¨s actif). (A-F14.)

### T-PAIEMENT-AVANT-COMMANDE — Aucune commande tant que le paiement n'a pas réussi — 15 min — À tester — date : —
Prérequis : Stripe en mode test (carte 4242 4242 4242 4242), webhook `checkout.session.completed` et `checkout.session.expired` actifs sur l'URL testée.
1. Client : ajouter une pièce au panier, « Confirmer la commande », arriver sur la page Stripe. NE PAS payer.
2. Admin > Commandes et Partenaire > Commandes : aucune nouvelle commande ; boîtes mail acheteur et partenaire : aucun e-mail. Fiche de la pièce : stock disponible diminué de 1 (réservation).
3. Revenir sur la boutique et payer le même panier avec la carte de test. Attendu : page « Votre paiement est en cours de confirmation » puis détail de la commande (n° AM-…).
4. Vérifier : une seule commande, un colis par partenaire, e-mail de confirmation acheteur (DA) et e-mail « nouvelle commande » au partenaire (une seule fois, même si Stripe renvoie l'événement).
5. Stripe > Développeurs > Webhooks > événement : réponse 200 ; renvoyer l'événement : toujours une seule commande.

### T-RESERVATION-IMPAYEE — Réservation impayée libérée, sans commande « Annulée » — 15 min — À tester — date : —
1. Client : « Confirmer », arriver sur Stripe, retour arrière du navigateur, « Confirmer » à nouveau (même e-mail).
2. Attendu : jamais « plus disponible » ; l'ancienne réservation est libérée, une seule nouvelle réservation ; stock disponible de la pièce = stock − 1.
3. Fermer l'onglet Stripe sans payer et attendre 30 à 35 min (ou laisser expirer la session). Attendu : stock disponible rétabli, AUCUNE commande (ni « Annulée ») dans les listes acheteur, partenaire et admin, aucun e-mail.
4. Cas limite : payer après l'expiration (session encore ouverte) : la commande est créée si le stock est toujours là ; sinon aucune commande, remboursement Stripe automatique et e-mail « Votre paiement est remboursé » au client (montant en €).

### T-STOCK-NOM — Erreur de stock nommant l'article — 5 min — À tester — date : —
1. Mettre une pièce à stock 1 ; avec le compte A, « Confirmer » et rester sur Stripe (réservation en cours).
2. Avec le compte B (autre e-mail), tenter de commander la même pièce. Attendu : message de stock citant le NOM de la pièce, aucune réservation ni commande créée pour B.
3. Panier de 2 pièces dont une seule épuisée : le message cite la pièce épuisée.

### T-ARCHIVAGE — Anciennes commandes jamais payées archivées — 10 min — À tester — date : —
0. Depuis Vercel (route temporaire, connecté en admin) : ouvrir `https://epomta.com/api/admin/archive-unpaid` (simulation JSON) ; l'exécution se fait par POST (console du navigateur : `fetch("/api/admin/archive-unpaid",{method:"POST"}).then(r=>r.json()).then(console.log)`). Non-admin : 403. Puis supprimer la route.
1. Simulation locale : `npm run db:archive-unpaid` (DATABASE_URL de la base visée, définie dans cmd pour la commande seulement). Attendu : liste dont AM-C83CA71A et AM-C08665C5 ; aucune commande payée/remboursée/expédiée listée ; rien modifié.
2. Exécution : `npm run db:archive-unpaid -- --execute`.
3. Attendu : ces commandes disparaissent des listes acheteur, partenaire et admin et des compteurs ; les commandes payées sont inchangées ; relancer la simulation : 0 commande.
### T-PROFIL-PARTENAIRE â€” Le partenaire modifie son profil â€” 5 min â€” Ã€ tester â€” date : â€”
1. Partenaire : Profil, renseigner adresse, e-mail de contact, tÃ©lÃ©phone, enregistrer.
2. Saisir un e-mail ou tÃ©lÃ©phone invalide : message d'erreur FR/EN.
3. Admin : Partenaires, journal : ligne Â« Profil modifiÃ© Â» avec date, auteur, champ, ancienne et nouvelle valeur.
4. Note : les renommages faits avant ce lot ne sont pas tracÃ©s (pas de rÃ©tro-remplissage).

### T-PROFIL-ADMIN â€” L'admin modifie un profil partenaire â€” 5 min â€” Ã€ tester â€” date : â€”
1. Admin : Partenaires, Â« Modifier le profil Â» d'un partenaire.
2. Changer le nom, les coordonnÃ©es, les bios, enregistrer.
3. Un nom dÃ©jÃ  pris est refusÃ©.
4. Le journal affiche l'auteur (e-mail admin) et l'ancienne/nouvelle valeur ; le partenaire voit les nouvelles valeurs.

### T-AUDIT-PROFIL â€” Journal d'audit des profils â€” 5 min â€” Ã€ tester â€” date : â€”
1. Admin : Partenaires, Â« Modifier le profil Â» d'un partenaire, changer le tÃ©lÃ©phone, enregistrer.
2. Revenir sur Partenaires, section Â« Journal d'audit Â» : ligne Â« Profil modifiÃ© Â» en tÃªte (date, partenaire, dÃ©tail Â« phone : ancien â†’ nouveau Â», auteur = e-mail admin).
3. Se connecter comme partenaire, changer son nom : nouvelle ligne avec l'e-mail du partenaire.
4. Filtrer par partenaire puis par action Â« Profil modifiÃ© Â» ; vÃ©rifier la pagination (25 lignes par page).

### T-NOM-ENTETE â€” Nom du partenaire dans l'en-tÃªte â€” 2 min â€” Ã€ tester â€” date : â€”
1. Partenaire : renommer le profil (ex. Mia-Mia) et enregistrer.
2. Recharger : le nom dans le menu compte (en-tÃªte) et sur la page Â« Mon compte Â» est le nouveau nom, sans reconnexion.
3. MÃªme contrÃ´le aprÃ¨s un renommage par l'admin (Modifier le profil). Note : les comptes renommÃ©s avant ce correctif sont resynchronisÃ©s au prochain renommage ; l'en-tÃªte lit dÃ©jÃ  le nom du profil partenaire.

### T-TABLEAU-PARTENAIRES â€” Tableau compact des partenaires â€” 5 min â€” Ã€ tester â€” date : â€”
1. Admin, Partenaires : tableau Nom, Pays, Savoir-faire, Commission (%), Statut, E-mail compte, E-mail contact (Â« â€” Â» si vide : repli sur le compte), Date, Actions ; la recherche trouve aussi par e-mail de contact.
2. Tester recherche, onglets de statut, tri par date, pagination.
3. Une seule ligne (~40 px) par partenaire ; colonne Actions alignÃ©e Ã  droite : Â« Modifier le profil Â», Â« GÃ©rer les crÃ©ations Â», Â« Statutâ€¦ Â».
4. Â« Statutâ€¦ Â» ouvre une fenÃªtre : action (Suspendre/RÃ©voquer ou RÃ©activer), motif obligatoire (sauf rÃ©activation), Valider ; sans motif, la validation est refusÃ©e. Annuler ferme la fenÃªtre sans effet.

### T-EMAIL-CONTACT â€” E-mails partenaire vers l'e-mail de contact â€” 8 min â€” Ã€ tester â€” date : â€”
1. Admin : Â« Modifier le profil Â» de Mia-Mia, mettre une autre adresse dans Â« E-mail de contact Â», enregistrer.
2. Client : passer une commande contenant une piÃ¨ce de Mia-Mia.
3. Attendu : l'e-mail Â« nouvelle commande Â» arrive sur l'adresse de contact, pas sur l'e-mail de connexion.
4. Vider l'e-mail de contact, refaire une commande : l'e-mail arrive sur l'e-mail de connexion (repli).
5. ContrÃ´ler aussi : annulation client, suspension/rÃ©activation, versement (mÃªme adresse). L'e-mail de connexion reste inchangÃ©. (A-F16 couvre la rÃ¨gle.)

### T-RETOURS-GRATUITS â€” Mention Â« retours gratuits Â» retirÃ©e â€” 3 min â€” Ã€ tester â€” date : â€”
1. FR puis EN : ouvrir le panier (bureau et mobile), le checkout, une fiche produit.
2. Attendu : aucune mention Â« Retours gratuits sous 30 jours Â» / Â« Free returns within 30 days Â», ni autre mention Â« gratuit/offert Â» en remplacement.
3. Ouvrir les e-mails de commande : mÃªme contrÃ´le. Les pages Retours et remboursements restent inchangÃ©es.
