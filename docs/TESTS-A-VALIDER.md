# Tests à valider — E póm ta’

Fichier UNIQUE de tests (règle permanente : chaque lot ajoute ses tests ici, avec étapes numérotées détaillées ; aucun autre fichier de tests). Mis à jour à chaque lot (même commit). Statut : Testé (validé par l'utilisateur) / À tester. Les tests historiques (lots A à D, suspension, traduction, fiche création) sont en fin de fichier (H-xx). Comptes : Client (compte client), Créateur (partenaire actif), Admin (e-mail dans `ADMIN_EMAILS`), partenaires de test KeNoF, Nathalie Morère, Cruzz Taylor (`npm run db:seed-suppliers`).

## BLOC B — Tests automatisés (exécutés par l'agent)

Relancer : `npm test` (Vitest, sans base) ; `npm run test:all` (base jetable `TEST_DATABASE_URL` + Vitest + Playwright). Détails : `docs/DEPLOIEMENT.md`, section « Tests automatisés ». Ce tableau est mis à jour à chaque exécution.

Lancer : GitHub › Actions › « Tests automatisés » › Run workflow (aussi sur chaque PR/push vers main) ; résultats dans l'artefact `resultats-tests` (rapport Playwright HTML + JUnit Vitest) ; les tests sur base réelle (A-T4) y tournent sur la branche Neon de test. Config : docs/DEPLOIEMENT.md.

Parcours historiques (Actions #1, 10/11/2026) : search 4 et mobile 2 corrigés (textes périmés, recherche "sculpture", langue mobile via /login, bouton « Vérifier mon adresse »). journey.spec.ts : test 1 corrigé ; les tests 2 à 11 (galerie, fiche œuvre/artiste, panier, inscription x2, connexion, checkout connecté/invité/vide) sont marqués `test.skip` (« à réécrire : header/checkout 2 étapes ») ; journey : 1 OK / 10 ignorés.

Dernière exécution : 10/11/2026 — Vitest 33 OK / 6 ignorés (base de test non disponible sur le poste de l'agent : sans Docker ni branche Neon) ; Playwright `e2e/lot-t.spec.ts` 23 OK.
Dernière exécution (11/11/2026, lot admin + e-mails de retour) : Vitest 62 OK / 6 ignorés (base de test indisponible sur le poste de l'agent) ; tsc et eslint sans erreur.

| ID | Lot | Description | Fichier | Dernier résultat | Couvre (manuel) |
|---|---|---|---|---|---|
| A-T1 | T | Webhook Stripe : signature valide/invalide/expirée/absente | `tests/unit/stripe-signature.test.ts` (Vitest) | OK 5/5 — 10/11/2026 | T-STRIPE 8 |
| A-T2 | T | Webhook HTTP : 400 si signature invalide, 200 si valide | `e2e/lot-t.spec.ts` (Playwright) | OK 2/2 — 10/11/2026 | T-STRIPE 8 |
| A-T3 | T | Remboursement : DONE / FAILED / MANUAL / AWAITING, idempotence | `tests/unit/refund.test.ts` (Vitest) | OK 8/8 — 10/11/2026 | T-REMB (logique) |
| A-T4 | T | Double annulation concurrente, annulation après expédition, expiration 48 h, droits d'accès, AWAITING (base réelle) | `tests/unit/suborders.db.test.ts` (Vitest) | Ignoré 6/6 (sans `TEST_DATABASE_URL`) — à lancer avec `npm run test:all` | T-COLIS (logique) |
| A-T5 | T | Garde-fou base de test (refuse prod/même URL/clé live) | `tests/unit/guard.test.ts` (Vitest) | OK 4/4 — 10/11/2026 | — |
| A-T6 | T | E-mails : aucune mention interdite, images en URL absolue https | `tests/unit/emails.test.ts` (Vitest) | OK 5/5 — 10/11/2026 | T-MAILS 1 (URL ; rendu visuel reste manuel) |
| A-T7 | T | Bandeau : aucune requête GA ni cookie `_ga` avant consentement/refus ; choix mémorisé ; accepter charge gtag | `e2e/lot-t.spec.ts` (Playwright) | OK 3/3 — 10/11/2026 | T-GA4 (parties réseau/cookies) |
| A-T8 | T | Pages d'aide FR/EN : 200, texte présent, sans mention interdite (7 pages × 2 langues ; exemple de n° de commande au format réel AM-1A2B3C4D) | `e2e/lot-t.spec.ts` (Playwright) | OK 14/14 — 10/11/2026 | T-AIDE (hors relecture) |
| A-T9 | T | Accès : visiteur redirigé depuis admin, retours admin, commandes partenaire, commandes client | `e2e/lot-t.spec.ts` (Playwright) | OK 4/4 — 10/11/2026 | H (accès) |
| A-M1 | M | Fournisseur e-mail : Resend (from, reply_to, sans mention interdite) ; repli Gmail / aucun sans erreur | `tests/unit/email-provider.test.ts` (Vitest) | OK 2/2 — 10/11/2026 | T-MAIL-FROM (payload) |
| A-M2 | M | Mur d'accès : images `/api/media/<id>` et `/images/artworks/*` publiques, reste fermé | `tests/unit/proxy-images.test.ts` (Vitest) | OK 2/2 — 10/11/2026 | T-MAIL-FROM 3 |
| A-E1 | E | Retours : éligibilité (livré, 30 j, doublon), propriétaire, motif, décision unique, remboursement DONE/échec + écriture comptable annulée | `tests/unit/returns.test.ts` (Vitest) | OK 11/11 — 10/11/2026 | T-RETOUR 3-7 (logique) |
| A-F1 | F | Listes admin et partenaire : paramètres d'URL (statut par défaut « à traiter », dates, page ≥ 1), pagination 25/page, filtres Commandes/Versements/Retours/Candidatures/Partenaires, espace partenaire limité à son compte, pastilles de compteur (admin et partenaire) | `tests/unit/admin-list.test.ts` (Vitest) | OK 21/21 — 11/11/2026 | T-ADMIN-FILTRES 1-9 (logique) |
| A-F2 | F | E-mails de retour (demande reçue, accepté, refusé, remboursé) FR/EN : gabarit DA, image en URL absolue, aucune mention interdite, motif et montant (€) | `tests/unit/admin-list.test.ts` (Vitest) | OK 10/10 — 11/11/2026 | T-RETOUR 2, 4-6 (contenu) |
| A-F3 | F | Règle DA : tout e-mail sortant est habillé du gabarit commun (`ensureTemplate`), `lang=` et Content-Language corrects, aucun envoi direct hors `src/lib/email.ts` | `tests/unit/email-template-guard.test.ts` (Vitest) | OK 4/4 — 11/11/2026 | T-RETOUR 2 (langue FR dans Gmail) |
| A-F4 | F | Contact : e-mail unique contact@epomta.com, téléphones masqués sans variable CONTACT_PHONE_LOCAL/INTL | `tests/unit/contact.test.ts` (Vitest) | OK 2/2 — 11/11/2026 | T-CONTACT (logique) |
| A-F5 | F | Page commande : texte « retour sous 30 jours » masqué si un retour existe ; règle `live` (œuvre sans partenaire invisible) | `tests/unit/tracking-notice.test.ts`, `tests/unit/catalog-live.test.ts` (Vitest) | OK — 11/11/2026 | T-COLIS-REMB 1 |
| A-F6 | F | Bouton « Réinitialiser » des filtres (garde l'onglet de statut) | `tests/unit/list-reset.test.ts` (Vitest) | OK 2/2 — 11/11/2026 | T-FILTRES-RESET (logique) |
| A-F8 | F | Règle « action restante » (onglet + pastille admin) : colis en cours, ou remboursement MANUAL/FAILED avec paiement réel ; expirée sans paiement = annulée | `tests/unit/todo-rule.test.ts` (Vitest) | OK 4/4 — 11/11/2026 | T-ADMIN-FILTRES 4 |
| A-F11 | F | URL de retour Stripe/liens : domaine de la requête (liste blanche epomta.com, epomta-demo.vercel.app), sinon origine configurée | `tests/unit/origin.test.ts` (Vitest) | OK 3/3 — 11/11/2026 | T-DOMAINE |
| A-F12 | F | Nom d'article cliquable vers la fiche produit dans le récapitulatif e-mail (annulée, en route…) | `tests/unit/email-item-link.test.ts` (Vitest) | OK 2/2 — 11/11/2026 | T-RACHAT-LIEN |
| A-F13 | F | Mur d'accès actif sur epomta.com, www.epomta.com et epomta-demo.vercel.app (page, API ; exemptions webhook/médias conservées) ; robots.txt Disallow + noindex | `tests/unit/wall-hosts.test.ts` (Vitest) + `e2e/access.spec.ts` | OK 3/3 unit — 12/11/2026 | T-MUR-EPOMTA |
| A-F10 | F | Montants des e-mails au format de la langue (EN « €55.00 », FR « 55,00 € ») | `tests/unit/money-locale.test.ts` (Vitest) | OK 2/2 — 11/11/2026 | T-MAILS (format EN) |
| A-F9 | F | Mur d'accès : API et images hors exemptions bloquées (401), artworks e-mail publics (≠ 401), manifeste/icônes PWA | `e2e/access.spec.ts` (Playwright) | OK 5/5 en local — 11/11/2026 (CI à relancer) | — |

Parcours Playwright historiques (`e2e/journey.spec.ts`, `access.spec.ts`, `alerts.spec.ts`, `search.spec.ts`, `order-email.spec.ts`, `mobile.spec.ts`) : inchangés, non relancés dans ce lot.

## BLOC A — Tests manuels (à faire par l'utilisateur)

Les tests ci-dessous restent manuels (rendu visuel, e-mails dans Gmail, mobile, relecture des textes, tableau de bord Stripe). Quand un point est couvert par le bloc B, c'est indiqué.

## Lots récents

### T-MAIL-FROM — E-mail réel depuis contact@epomta.com — 10 min — Validé le 10/11/2026 sauf l'étape 3 (images : correctif /images/artworks, à revérifier) — date : 10/11/2026
Prérequis : RESEND_API_KEY et MAIL_FROM définis sur Vercel.
1. Passer une commande test (ou renvoyer le webhook) avec une adresse Gmail. Résultat : e-mail reçu.
2. Vérifier l'expéditeur : « Epomta <contact@epomta.com> ».
3. Vérifier que les images s'affichent.
4. Vérifier le dossier : boîte de réception, pas spam.
5. Gmail › ⋮ › Afficher l'original : DKIM, SPF, DMARC = PASS.
6. Répondre : la réponse arrive dans contact@epomta.com (Zimbra).

### T-RETOUR — Retours (lot E) — 15 min — À tester — date : —
Prérequis : migration 0023 appliquée ; un colis livré (compte client) ; compte admin (ADMIN_EMAILS).
1. Compte client : Mon compte › Mes commandes › commande dont le colis est « Livré ». Résultat : champ « Motif du retour » et bouton « Demander un retour ».
2. Saisir un motif, cliquer sur « Demander un retour ». Résultat : mention « Retour demandé » à la place du formulaire ; e-mail de confirmation reçu dans Gmail (rendu visuel à relire).
3. Compte admin : menu Admin › Retours. Résultat : la demande apparaît avec colis, montant (€) et motif.
4. Cliquer « Refuser » avec une note. Résultat : statut « Retour refusé », e-mail client avec le motif. (Refaire avec une autre demande pour la suite.)
5. Cliquer « Accepter ». Résultat : statut « Retour accepté », e-mail client.
6. Cliquer « Rembourser (Stripe) ». Résultat : statut « Remboursé » ; dans le dashboard Stripe (sandbox), un remboursement du montant du colis (€) existe ; e-mail client.
7. Sans paiement Stripe : cliquer « Rembourser » puis « Marquer remboursé (manuel) ». Résultat : message d'erreur puis statut « Remboursé ».
8. Colis livré depuis plus de 30 jours ou non livré : aucun formulaire de retour. Version anglaise : textes en EN.

| ID | Lot | Durée | Statut | Date |
|---|---|---|---|---|
| T-GA4 | GA4 + consentement | 15 min | À tester | — |
| T-COLIS | Multi-colis + annulation | 20 min | À tester | — |
| T-SUIVI | Suivi de livraison + remboursement (lots 1–2) | 15 min | À tester | — |
| T-MAILS | E-mails Farfetch | 10 min | Partiel : étape 1 testée | 10/11/2026 |
| T-AIDE | Pages d'aide FR/EN | 10 min | À tester | — |
| T-ADMIN-FILTRES | Filtres, pagination et pastilles (admin + partenaire) ; e-mails de retour | 20 min | À tester | — |
| T24 | Parcours de commande complet (achat → livraison) | 20 min | À tester | — |
| T-STRIPE | Paiement Stripe Checkout + webhook (lot 0) | 15 min | Partiel : étapes 2, 3, 4, 5, 8 testées ; 1, 6, 7 à tester | 10/11/2026 |
| T-REMB | Remboursement au refus/expiration/annulation | 15 min | Partiel : étapes 1, 2 testées | 10/11/2026 |
| H-01 à H-16 | Lots A à D, suspension, traduction, fiche création | 60 min | À tester | — |

### T-GA4 — GA4 et bandeau de consentement
Prérequis : `NEXT_PUBLIC_GA_ID` défini (ex. G-XXXX) ; navigation privée, onglet Réseau/Application des outils développeur ouvert.
1. Ouvrir `/fr` en navigation privée. Résultat : bandeau avec « Accepter tout », « Refuser tout », « Personnaliser ».
2. Avant tout clic : onglet Réseau, aucune requête vers googletagmanager/google-analytics ; Application > Cookies : aucun `_ga`.
3. Cliquer « Refuser tout » : bandeau fermé, toujours aucune requête ni cookie `_ga`.
4. Recharger : le bandeau ne revient pas (choix mémorisé).
5. Pied de page > « Gestion des cookies » : le bandeau se rouvre.
6. « Personnaliser » : catégories Nécessaires (active, non modifiable), Mesure d'audience (désactivée), Publicité (désactivée).
7. Activer Mesure d'audience, enregistrer : requêtes GA et cookies `_ga`, `_ga_*` apparaissent après le choix.
8. Vérifier la durée des cookies `_ga` (13 mois maximum).
9. Rouvrir « Gestion des cookies », « Refuser tout » : le suivi s'arrête.
10. Même parcours en `/en` : textes en anglais.
11. Sans `NEXT_PUBLIC_GA_ID` (environnement local) : aucun script chargé. Lire les pages Cookies et Confidentialité : description conforme (cookies, durée, transfert vers Google).

### T-COLIS — multi-colis et annulation
Prérequis : Client connecté ; articles de 2 créateurs ; 2 comptes créateurs actifs.
1. Panier avec 2 articles de 2 créateurs : message « expédiée en 2 colis, par 2 créateurs différents, à des dates différentes », Colis 1/2 et 2/2 avec « Préparation sous 2 jours ouvrés », aucune ligne de frais. Avec un seul créateur : message au singulier.
2. Même bloc sur la page de paiement ; payer.
3. Compte > Mes commandes > détail : cartes « Colis 1 sur 2 » et « Colis 2 sur 2 », bouton « Annuler ma commande » sur chacune.
4. Cliquer le bouton : confirmation ; Annuler ne fait rien.
5. Confirmer : colis « Annulée », mention de remboursement, commande globale non annulée.
6. Vérifier les e-mails (client et créateur).
7. Créateur : passer l'autre colis à « Expédié » : le bouton disparaît côté client, texte renvoyant au retour sous 30 jours ; mail « Colis 2 sur 2 ».
8. Annuler les 2 colis : « Commande annulée » ; tous livrés : « Commande livrée ».
9. Deux onglets : expédier dans l'un, annuler dans l'autre : aucune annulation.
10. Avec un autre compte client : impossible d'annuler un colis étranger. Pages Aide FR/EN : texte d'annulation à jour.

### T-SUIVI — suivi de livraison et remboursement (lots 1–2)
Prérequis : migration 0020 appliquée.
1. Créateur : commande acceptée, formulaire d'expédition : choisir UPS, saisir un numéro, valider.
2. Mail « en route » : lien « Suivre mon colis » vers la page UPS avec le numéro.
3. Compte client, détail de commande : lien « Suivre mon colis » présent ; absent pour un transporteur « Autre ».
4. Marquer livré : mail « livrée » avec le même lien.
5. Annuler un colis sans STRIPE_SECRET_KEY : « remboursement en cours de traitement », `refundStatus` = MANUAL en base.
6. Avec une clé Stripe de test et `stripePaymentIntentId` posé sur la commande : annulation = DONE, mail « remboursement effectué », visible dans Stripe.
7. Clé invalide : FAILED, texte « en cours de traitement ». Deux onglets : un seul remboursement.

### T-MAILS — e-mails clients
1. Passer une commande : e-mail « reçue » centré, logo, titre en majuscules, vignette (image visible : TESTÉ le 10/11/2026), taille (× 1 · M), total, adresse, aide, pied.
2. Marquer expédié : e-mail « en route » avec bouton « Suivre ma commande », adresse, « Colis X sur N ».
3. Marquer livré : bouton « Voir ma commande ».
4. Vérifier : aucune mention démo/fictif/simulé, pas de « Livraison : Offerte », nom propre du créateur, rendu mobile.

### T-STRIPE — paiement Stripe (lot 0)
Prérequis : migration 0021 appliquée ; clés Stripe de test ; webhook `/api/stripe/webhook` (événement checkout.session.completed) déclaré dans Stripe avec STRIPE_WEBHOOK_SECRET.
1. Sans STRIPE_SECRET_KEY : passer commande, confirmation et e-mails immédiats comme avant.
2. Avec les clés : Client, panier, « Commander » : redirection vers la page Stripe, montant correct. — TESTÉ 10/11/2026
3. Payer avec la carte de test 4242 4242 4242 4242 : retour sur la confirmation de commande. — TESTÉ 10/11/2026
4. Vérifier : e-mail « reçue » et notification au créateur arrivent après le paiement (webhook), une seule fois. — TESTÉ 10/11/2026
5. En base : `stripePaymentIntentId` renseigné, `paymentPending` = false. — TESTÉ 10/11/2026
6. Abandonner sur la page Stripe : aucun e-mail envoyé, commande en attente de paiement.
7. Annuler ensuite un colis payé : remboursement Stripe automatique (voir T-SUIVI).
8. Webhook avec signature invalide (curl) : réponse 400. — TESTÉ 10/11/2026

### T-REMB — remboursement au refus / expiration / annulation
Prérequis : migration 0022 ; STRIPE_SECRET_KEY de test ; commande payée via Stripe.
1. Client : commande payée (carte 4242…), webhook reçu (`stripePaymentIntentId` renseigné). — TESTÉ 10/11/2026
2. Créateur : refuser le colis avec un motif. Résultat : Stripe > Paiements > Refund créé (montant du colis), `refundStatus` = DONE. — TESTÉ 10/11/2026
3. Compte client et e-mail « Commande annulée » (refus, expiration, annulation client/admin) : « Vous serez remboursé de X,XX € … sous 5 à 10 jours ouvrés » (FR et EN).
4. Refaire avec annulation client, puis annulation admin : même résultat.
5. Colis sans réponse 48 h (expiré) : remboursement créé au passage du cron.
6. Refuser un colis avant le webhook (paiement non confirmé) : `refundStatus` = AWAITING ; renvoyer le webhook : remboursement créé.
7. Clé Stripe invalide : `refundStatus` = FAILED, `refundNote` explicite, ligne `[refund]` dans les logs Vercel ; e-mail et compte : message neutre « nous revenons vers vous », sans montant. Sans paiement Stripe : aucune mention de remboursement.
8. Commande AM-ECAD4CB3 : à rattraper (voir handoff) ou nouvelle commande.

### T-AIDE — pages d'aide
1. Ouvrir `/fr/support/faq`, `orders`, `payment`, `returns`, `terms`, `privacy`, `cookies`, `contact` : contenu complet, menu latéral commun.
2. Widget « Ce contenu vous semble-t-il pertinent ? » : cliquer Oui puis Pas vraiment.
3. Mêmes pages en `/en`. Vérifier : retours par colis, signature transporteur, annulation depuis le compte, e-mail de contact inchangé.

### T24 — parcours complet
1. Client : acheter 2 créations (2 créateurs), panier puis paiement.
2. Créateurs : accepter, préparer, expédier (transporteur + suivi), livrer.
3. Client : suivre chaque colis, e-mails reçus à chaque étape.
4. Admin : voir les sous-commandes dans `/fr/admin/commandes` et le registre dans `/fr/admin/versements`.

### T-ADMIN-FILTRES — Filtres, pastilles et e-mails de retour — 20 min — À tester — date : —
Couvert en partie par A-F1, A-F2, A-F3 (logique, gabarit) ; reste le rendu visuel et la prise en main.
1. Compte admin : ouvrir Admin. Résultat : pastilles numérotées sur Candidatures, Créations à modérer, Commandes (escaladées), Versements (à payer), Retours (demandés) quand il y a du travail ; aucune pastille à 0.
2. Admin › Retours : onglet « À traiter » par défaut avec son compteur ; cliquer « Remboursés », « Refusés », « Tous ». Résultat : la liste change, l'URL contient `?st=…`.
3. Retours : saisir un n° de colis dans « Recherche », une période (Du/Au), cliquer « Filtrer ». Résultat : seules les lignes correspondantes ; recharger la page conserve les filtres.
4. Admin › Commandes : défaut « À traiter » (sans réponse / remboursement à reprendre) ; tester onglets En cours, Expédiées, Livrées, Annulées ; recherche par n° de colis, nom ou e-mail du client, nom du partenaire.
5. Admin › Versements : défaut « À payer » ; onglets « En attente (délai de retour) » et « Tous les partenaires » ; recherche partenaire ; historique des versements filtré par période.
6. Admin › Candidatures (défaut « À traiter ») et Partenaires (défaut « Actifs ») : onglets de statut, recherche nom/e-mail/pays/métier, période.
7. Avec plus de 25 lignes (ou en réduisant le filtre), vérifier « Page 1 / n », « Suivant → », « ← Précédent » : 25 lignes par page, filtres conservés d'une page à l'autre.
8. Compte partenaire : menu Espace partenaire › pastille sur Commandes (colis à accepter/expédier) et Créations (refusées) ; Commandes (défaut « À traiter »), Paiements (défaut « Disponibles ») avec recherche, période et pagination.
9. Mobile : onglets de statut et formulaire de filtres lisibles, boutons ≥ 44 px, pas de défilement horizontal de la page.
10. E-mails de retour (voir T-RETOUR 2, 4, 5, 6) : logo « E PÓM TA' », titre en capitales, bouton noir, récapitulatif avec vignette (image visible), pied d'aide ; Gmail n'affiche plus « Ce message semble être en anglais » sur un e-mail FR.

## Recette historique (lots A à D, suspension, traduction, fiche création)

Chaque bloc ci-dessous est un test (ID H-xx) ; ses étapes sont numérotées. Statut de chaque test : À tester, sauf mention contraire.


### H-01 — Lot A — Candidature et validation admin
Statut : À tester — Date : —
URLs (remplacer `fr` par `en` pour l'anglais) : `/fr/fournisseur`, `/fr/fournisseur/candidature`, `/fr/admin/candidatures`, `/fr/admin/fournisseurs`, `/fr/account`.

1. Visiteur non connecté sur `/fr/fournisseur/candidature` : invité à se connecter.
2. Visiteur sur `/fr/fournisseur/tableau-de-bord` : redirigé vers la connexion.
3. Client connecté (non partenaire) sur le tableau de bord partenaire : redirigé vers la candidature.
4. Client sur `/fr/admin` : renvoyé à l'accueil.
5. Client remplit et envoie la candidature : message « Candidature envoyée ». **E-mail** de confirmation au candidat ; **e-mail** à l'admin.
6. Renvoyer une 2e candidature en attente : message « déjà en cours d'examen ».
7. Candidature sans lien ET sans fichier : refusée avec message clair (« lien OU fichier »).
8. Candidature sans lien mais avec 1 à 5 fichiers (JPG/PNG/WebP/PDF, 4 Mo max chacun) : miniatures affichées, suppression possible, envoi accepté. Les erreurs sont explicites (trop lourd, format, session expirée, erreur serveur, code HTTP). Prérequis Neon : migrations appliquées jusqu'à `0010_application_files` (table `ApplicationFile`) ; sans elle l'envoi échoue avec « Erreur du serveur… ».
9. Fichier .exe/.txt renommé en .jpg, ou > 4 Mo : refusé. 6e fichier : refusé.
10. Admin : la fiche candidature montre les miniatures (clic = agrandi) et les PDF (téléchargeables) ; un autre client ne peut pas ouvrir ces fichiers.
11. Admin, `/fr/admin/candidatures` : la candidature apparaît « À traiter ».
12. Admin « Demander des infos » (avec message) : statut mis à jour ; **e-mail** au candidat ; le candidat voit la note et peut renvoyer.
13. Admin « Refuser » : **e-mail** de refus.
14. Admin « Accepter » : **e-mail** de bienvenue ; le candidat accède à `/fr/fournisseur/tableau-de-bord`.
15. Partenaire : modifier le profil (nom, pays, bio, vidéo) puis recharger : valeurs conservées.
16. Admin, `/fr/account` : plus de bloc « Vue (admin) » ; l'accès se fait par les lignes « Administration » / « Mon espace partenaire » de « Mon compte ».
17. Admin : `/fr/admin/fournisseurs`, « Voir son espace » sur un partenaire de démo : espace affiché en lecture seule (bandeau « Vue admin »), « Quitter » ferme la vue.
18. Un admin ne peut pas ouvrir l'espace d'un vrai partenaire (seules les démos sont proposées).


### H-02 — Lot B — Créations et stock
Statut : À tester — Date : —

Prérequis : `npm run db:seed-suppliers` (partenaires de démo avec créations, variantes et une création à modérer) ; `npm run db:check-stock` (vérification automatique du stock, dont la concurrence sur la dernière pièce). Variable Vercel optionnelle : `BLOB_READ_WRITE_TOKEN` (non utilisée pour l'instant : photos stockées en base, ≤ 300 Ko ; interface `PhotoStorage` dans `src/lib/storage.ts` à brancher sur Vercel Blob).

Comptes : partenaire actif (accepté au lot A), admin (`ADMIN_EMAILS`), client.


#### H-03 — Partenaire — `/fr/fournisseur/oeuvres`
Statut : À tester — Date : —
1. Menu « Créations et stock » ; liste vide au début ; bouton « Ajouter une création ».
2. Nouvelle création : titres FR/EN, description (≥ 20 car. pour soumettre), catégorie, prix + devise (XOF, XAF, USD…), dimensions, poids, 1 à 6 photos (compressées auto, 1re = couverture, suppression possible).
3. Stock initial : quantité, case « Pièce unique » (= 1), ou variantes (« S: 3 » une par ligne).
4. Catégorie peinture/sculpture/photographie : bloc facultatif Édition, photo de signature, case « Je certifie être l'auteur » (horodatée). Aucun bloc pour la mode.
5. « Enregistrer le brouillon » → statut Brouillon ; « Enregistrer et soumettre » → En modération. E-mail attendu côté admin (« Création à modérer »).
6. Profil : signature dessinée ou téléversée, enregistrée une seule fois.
7. Fiche création, section Stock : entrée de stock, correction (refusée si elle passe sous le réservé), nouvelle variante ; historique des mouvements avec date, type, quantité, motif, auteur.
8. Un partenaire ne voit/modifie jamais les créations d'un autre (URL directe → 404).


#### H-04 — Admin — `/fr/admin/oeuvres`
Statut : À tester — Date : —
1. File des créations soumises avec photos, prix, stock, attestation/édition ; « Publier » ou « Refuser » (motif obligatoire). E-mail au partenaire dans les deux cas.
2. Admin `/fr/admin/oeuvres` : onglets En attente (défaut) / Publiées / Refusées / Toutes avec compteurs ; chaque création montre badge de statut, partenaire, date de décision et motif si refusée ; Publier/Refuser seulement en attente, Refuser (motif) possible sur une publiée ; une création traitée ne disparaît plus. Côté partenaire `/fr/fournisseur/oeuvres` : badges « En modération », « Publiée », « Refusée » (+ motif). Migration additive 0016 (`Product.decidedAt`) à appliquer sur Neon.
3. Admin saisit au nom d'un partenaire : `/fr/admin/fournisseurs` → bouton « Gérer les créations » visible seulement pour un partenaire ACTIF non démo (absent si suspendu/révoqué) → liste de ses créations → « Nouvelle création au nom du partenaire » : même formulaire, boutons Brouillon / « Envoyer en modération » / « Publier directement » (publiée = visible au catalogue, date de décision renseignée). Création marquée « Saisie par l'administration » (liste du partenaire et `/admin/oeuvres`) ; historique de stock : « Stock initial — créé par l'admin pour le compte de <partenaire> » (auteur = e-mail admin). Section art : signature/attestation non proposées à l'admin, le partenaire les complète dans son espace. La création est visible et modifiable dans `/fr/fournisseur/oeuvres` (photos saisies par l'admin conservées) ; commission 15 %, stock et commandes inchangés. Un non-admin qui poste `asSupplier` est redirigé (droits : ADMIN_EMAILS). Migration additive 0017 (`Product.createdByAdmin`) à appliquer sur Neon.
4. Admin `/fr/admin/oeuvres` en tableaux (25/page) : onglets En attente / Publiées / Refusées / Toutes avec compteurs qui respectent les filtres ; colonnes photo, partenaire, création, catégorie, prix (€), stock, description tronquée (infobulle), statut, décision (jj/mm/aaaa hh:mm, « — » si absente), motif (Refusées/Toutes), badge « Saisie par l'administration », actions. Filtre date (défaut Aujourd'hui, 7 j, 30 j, plage, Toutes les dates = inclut décisions sans date) ; En attente n'est jamais filtré par date (sélecteur grisé avec explication), et « Toutes » = en attente + publiées/refusées filtrées par date (compteur Toutes = somme des trois) ; message « N création(s) masquée(s) par le filtre de date » + lien « Voir toutes les dates » (décisions sans date incluses). Recherche, partenaire, catégorie, tri (partenaire, prix, décision) conservés dans l'URL ; Export CSV de la vue filtrée (admin uniquement, 403 sinon) ; cases + « Publier/Refuser la sélection » avec motif commun (refus sans motif refusé) ; état vide ; défilement horizontal à 390 px ; journal de stock paginé. Clic sur la photo = visionneuse (Échap, clic extérieur, bouton ×, précédent/suivant, balayage tactile), aussi dans `/fr/fournisseur/oeuvres`.
5. Admin `/fr/admin/oeuvres` colonne « En attente depuis » (En attente et Toutes) : date/heure de soumission + durée (« 2 h », « 3 j »), orange > 24 h, rouge > 72 h (constantes `WAIT_WARN_H`/`WAIT_ALERT_H`), tri par colonne (défaut En attente : plus ancienne d'abord), « la plus ancienne en attente : X » en tête, colonnes dans le CSV. Migration 0018 (backfill `submittedAt = createdAt`) à appliquer sur Neon.
6. Filtre de date : Du/Au reflètent la période (Aujourd'hui = jour/jour ; 7 jours = aujourd'hui−6 → aujourd'hui ; 30 jours idem ; Toutes les dates = champs vides) ; changer le sélecteur met à jour Du/Au sans rechargement puis applique le filtre ; modifier Du ou Au bascule sur « Plage personnalisée » ; Du > Au = message d'erreur (champs bornés min/max, URL inversée corrigée côté serveur) ; bornes en heure de Europe/Paris.
7. Liens vers la fiche : sur /admin/oeuvres, le titre d'une création publiée ouvre /produits/<slug> dans un nouvel onglet (↗, info-bulle « Ouvrir la fiche publique ») ; en attente/refusée = texte + lien « Voir côté partenaire » ; même lien dans le journal de stock et dans « Créations et stock » (publiées seulement).
8. Barre admin sur la fiche publique (visible uniquement pour un admin) : Retour à la modération / Refuser / Modifier.
9. Plage personnalisée avec seulement Du : les décisions sans date (avant 0016) n'apparaissent pas ; elles n'apparaissent que sous « Toutes les dates ».
10. URL propre (migration 0019 à appliquer sur Neon) : la page boutique d'un partenaire est /partenaires/<nom-nettoyé> (ex. /fr/partenaires/lolipat), suffixe -xxxx seulement en cas de doublon. Anciennes URL : /fr/createurs/... → 308 vers /fr/partenaires/... ; un ancien slug renommé (ex. lolipat-341c) → 308 vers le nouveau slug (table CreatorSlugAlias). Les liens du menu, pied de page, accueil, catalogue, recherche et fiches pointent sur /partenaires.
11. Photo de profil : Espace partenaire > Profil > « Photo de profil » (≤ 300 Ko) ; après enregistrement, elle s'affiche sur la page boutique, les cartes et l'accueil. Sans photo : médaillon doré avec les initiales (ex. « LP »).
12. Espace partenaire > Créations et stock = tableau (photo+lightbox, création avec ↗ si publiée, catégorie, prix €, stock, statut, motif de refus, « En attente depuis » orange > 24 h / rouge > 72 h, décision, Modifier / Ajuster le stock). Onglets avec compteurs : Toutes / En modération / Publiées / Refusées / Brouillons / Stock bas ; recherche, catégorie, statut, tri par colonne, pagination 25, Export CSV (mes-creations.csv) de la vue filtrée. Vérifier qu'un partenaire ne voit jamais les créations d'un autre (liste, CSV, journal). Journal de stock du partenaire paginé. Mobile 390 px : défilement horizontal.
13. Lot 3 quater : (101) une commande dont les créations n'ont pas de partenaire (créations d'exemple) apparaît dans Admin > Commandes, section « Commandes sans partenaire (créations d'exemple) » (ex. AM-BF63AC79) ; (102) « Mes commandes » : une commande sans partenaire reste « Confirmée » (plus de statut simulé « En préparation »), les commandes avec partenaire affichent les statuts des sous-commandes ; (103) « 1 article » / « 2 articles » (singulier/pluriel).
14. Lot 3 ter bis : (99) « Pays / Région » : sélecteur avec drapeaux SVG, recherche, FR/CM/BE/CI en tête (checkout, carnet d'adresses, adresse de commande) ; la valeur envoyée reste le nom du pays ; (100) téléphone invalide : message rouge intégré sous le champ (plus d'infobulle navigateur), contour rouge, persistant tant que le numéro est invalide ; l'envoi reste bloqué.
15. Lot 3 ter : « Publier » d'une seule création refusée (admin) : Confirmer publie bien (message « Création publiée. ») ; « Annuler et libérer le stock » (liste et détail) : motif saisi dans la fenêtre bien transmis ; « Enregistrer et renvoyer en modération » (partenaire) : Confirmer enregistre.
16. Lot 3 bis : (63-65) téléphone : sélecteur plus grand, drapeaux SVG, liste de pays recherchable (France, Cameroun, Belgique, Côte d'Ivoire en tête), champ toujours en numéro national formaté (« 6 68 97 30 76 ») ; (66/68) affichage « +33 6 68 97 30 76 » (récapitulatif, détail commande admin/partenaire, adresses) ; (67) message de validation du téléphone en français ; (58) « Plus que N » lisible sur la taille sélectionnée ; (59) « Ajouter au panier » réactivé après changement de taille/quantité ; (52/82) « Création publiée. » / « Création refusée. » après action admin.
17. Lot 3 (partiel) : (51/79) confirmations dans une fenêtre du site « Confirmer / Annuler » (plus de confirm() natif) ; (69/71) « Annuler et libérer le stock » → fenêtre « Annuler cette commande ? » avec motif obligatoire, champ retiré de la liste ; (70) lignes de commandes avec « › » ; (73) historique « Commande annulée par l'administration — motif : … » ; (81) « En attente depuis moins d'1 h ».
18. Lot F34-2 : (33) bloc « Authenticité » sur la fiche (date, édition, signature agrandissable) seulement si attestation ; (9) lignes vides masquées ; (10) taille/variante dans le panier ; (11) sélecteur − 1 + plafonné au stock, « Plus que N » (≤3) ; (12) téléphone avec indicatif (adresses, checkout) E.164 ; (13) plus de texte « simulés » dans Mes commandes ; (14) détail admin d'une commande (clic sur le numéro) ; (19) pas de modification d'adresse si commande annulée/expédiée ; (34) en-tête non collant en mobile ; (35) journal et tableau partenaire en cartes en mobile ; (8) colonne « Variante » du journal ; (37) « Nouveau » = moins de 60 jours.
19. Lot F34 (partiel) : (1) admin : « Publier » avec confirmation sur une création refusée, cases à cocher actives sur les refusées ; (3) renvoi en modération efface la date de décision ; (5/7) erreurs de stock « Le motif est obligatoire » / « Quantité invalide », libellé « Correction (+/−) » partout ; (6) onglet « Épuisées » distinct de « Stock bas » (partenaire) ; (16) alerte stock bas basée sur la somme des variantes ; (17) stock par taille « S 2 · M 1 » dépliable dans le tableau partenaire ; (21) modifier une création publiée côté partenaire → avertissement + « En modération » (admin : reste publiée) ; (22) badge « Saisie par l'administration » côté partenaire ; (23) e-mails « Création retirée du catalogue : {titre} » / « Création à revoir : {titre} » ; (24-26) tris, filtre Statut admin ; (29-30) CSV en français, heure de Paris ; (31) recherche « bague » insensible casse/accents ; (36) « Du » seul n'exclut/n'ajoute pas « Au » et masque les décisions sans date ; (40) curseur main sur tout élément cliquable ; (41) photo de profil > 300 Ko refusée (« Photo trop lourde (max 300 Ko). ») ; (42-44) nom de partenaire unique (casse/accents/espaces), « Ce nom est déjà utilisé par un partenaire. » ; (47) bouton « Choisir des fichiers » + compteur ; (48-49) page admin « Créations de {partenaire} » : message vide + e-mail ; (32 bis) alerte « Ajoutez l'attestation pour valoriser votre œuvre. » sur les créations d'art publiées sans attestation.
20. Terminologie : « œuvre » est remplacé par « création » partout dans l'UI, les e-mails, le CSV (`creations.csv`) et cette recette (FR) ; « Creation(s) » en EN ; URL `/oeuvres` inchangées ; « œuvre d'art » conservé pour l'authenticité/signature ; « Pièce unique » inchangé.
21. Création publiée → visible dans le catalogue et sur la fiche de l'artiste ; refusée → corrigeable puis re-soumettable ; dans la liste `/fr/fournisseur/oeuvres`, le motif du refus s'affiche sous le badge « Refusée » (2 lignes max, rouge discret).
22. Derniers mouvements de stock visibles.


#### H-05 — Client
Statut : À tester — Date : —
1. Fiche produit : « Pièce unique » (stock 1), « Plus que 2/3 », « En stock », « Épuisé » (non achetable) ; variantes épuisées barrées.
2. Achat de la dernière pièce : le stock est réservé (disponible 0, création « Épuisé » en catalogue) ; un second client reçoit une erreur de stock.
3. Stock bas : après l'achat, e-mail « stock bas » au partenaire si le disponible passe sous son seuil.
4. Confirmation à l'expédition, libération au refus/expiration/annulation, retour de stock : lot C.


### H-06 — Suspension / révocation d'un partenaire (`/fr/admin/fournisseurs`)
Statut : À tester — Date : —
Migration additive 0012 (`PartnerAudit`). Les partenaires de démo ne sont pas concernés.
1. Admin : sur un vrai partenaire, une seule ligne : champ « Motif » + liste « Action » (Actif : Suspendre/Révoquer ; Suspendu : Réactiver/Révoquer) + « Valider ». Sans motif (Suspendre/Révoquer) → blocage du formulaire ; avec motif → popup « Confirmer la suspension ? » (Oui/Non) ; « Non » n'exécute rien ; « Oui » → statut Suspendu, e-mail au partenaire, entrée au journal d'audit.
2. Chaque ligne affiche « Partenaire depuis le JJ/MM/AAAA » ; le journal (tableau date, partenaire, action, motif, auteur), groupé par partenaire en ordre chronologique, contient « Création du compte partenaire (candidature acceptée) » (y compris pour les anciens), puis chaque Suspension, Réactivation, Révocation avec date/heure, motif et auteur.
3. `/fr/fournisseur/candidature` : pour un partenaire existant (actif, suspendu ou révoqué) le titre est « Mon espace partenaire » (EN « My partner space ») et aucun formulaire de candidature n'apparaît ; « Candidature partenaire » + formulaire uniquement pour un utilisateur sans partenaire.
4. `/fr/account` : en tête de « Mon compte », une ligne « Mon espace partenaire » (›) pour un partenaire actif, suspendu ou révoqué (suspendu → message de suspension) et une ligne « Administration » (›) pour les ADMIN_EMAILS ; un client simple ne voit ni l'une ni l'autre. FR/EN, mobile 390 px et bureau.
5. Partenaire suspendu : `/fr/fournisseur` et le tableau de bord mènent à la page candidature avec « Votre espace partenaire est suspendu. », le motif et un lien « Contactez-nous », sans « Y accéder » ; portail bloqué. Idem « Votre accès partenaire a été révoqué. » après révocation. FR/EN, lisible à 390 px. Après réactivation : « Votre espace partenaire est ouvert. Y accéder » et accès normal.
6. Partenaire suspendu : `/fr/fournisseur` n'ouvre plus le portail ; ses créations publiées disparaissent du catalogue (statut « Masquée »).
7. « Réactiver » (motif facultatif, popup « Confirmer la réactivation ? ») : accès et créations rétablis, e-mail envoyé.
8. « Révoquer définitivement » : motif obligatoire, popup « Confirmer la révocation définitive ? » avec case « Anonymiser le profil » (décochée par défaut) ; refusé tant qu'une création a du stock réservé (commande en cours) ; anonymisation : nom, bio, vidéo, signature effacés ; commandes et paiements conservés. Aucune suppression physique.


### H-07 — Lot C — Commandes par partenaire
Statut : À tester — Date : —
Migration additive 0013 (`SubOrder`, `OrderItem.subOrderId`). Vérification automatique : `npm run db:check-orders` (scission, autorisations, 48 h, relance/escalade/expiration, libération et confirmation du stock). Variables : `CRON_SECRET` (cron `/api/orders/sweep`, quotidien sur Vercel Hobby ; le balayage tourne aussi au chargement des pages Commandes et après chaque commande), `ADMIN_EMAILS`, e-mail existant.
Comptes : client (ou invité), partenaire actif (ex. compte accepté au lot A avec une création publiée au lot B), admin (`ADMIN_EMAILS`).


#### H-08 — Client — achat
Statut : À tester — Date : —
1. Acheter 2 créations de 2 partenaires différents (panier → paiement test). Page de confirmation et `/fr/account/orders/<n°>` : un bloc « Vendu et expédié par [boutique] (pays) » par partenaire, état « À accepter », mention « E póm ta’ est l'intermédiaire ».
2. Stock : la création est réservée (disponible −1). E-mail « nouvelle commande » à chaque partenaire (échéance 48 h).


#### H-09 — Partenaire — `/fr/fournisseur/commandes`
Statut : À tester — Date : —
1. Tableau de bord : compteurs « À accepter », « À préparer / expédier », « En livraison ». Liste filtrable (À accepter, À expédier, Expédiées, Clôturées) ; un partenaire ne voit que ses sous-commandes (URL d'un autre → 404).
2. Ouvrir la commande : articles, adresse de livraison, échéance. « Accepter » → état Acceptée, e-mail au client.
3. « Marquer en préparation » puis « Marquer expédiée » : transporteur et suivi obligatoires. Stock confirmé (mouvement « Vente » dans l'historique de la création, stock physique −1, réservé −1). E-mail au client avec le suivi.
4. « Marquer livrée » → e-mail au client ; le client voit « Livrée ».
5. Refus : refuser avec motif (obligatoire) → commande annulée, stock libéré (mouvement « Libération »), e-mail au client. La pièce unique redevient achetable.


#### H-10 — 48 h, relance, escalade
Statut : À tester — Date : —
1. Sans réponse : relance e-mail au partenaire à 24 h, e-mail d'escalade aux admins à 36 h (et badge « Sans réponse » dans `/fr/admin/commandes`), annulation automatique à 48 h (stock libéré, client prévenu). Pour tester sans attendre : `npm run db:check-orders` simule ces délais ; en manuel, appeler `/api/orders/sweep` avec `Authorization: Bearer <CRON_SECRET>`.


#### H-11 — Admin — `/fr/admin/commandes`
Statut : À tester — Date : —
1. Toutes les sous-commandes avec boutique, état, suivi. « Annuler et libérer le stock » (motif obligatoire) sur une commande non expédiée → client prévenu.
2. Suspension/révocation : la révocation est refusée tant que le partenaire a des commandes ouvertes.
3. « Voir comme » un partenaire de démo : commandes en lecture seule.

Limites : paiement = test (aucun débit) ; retour/litige et retour de stock après livraison au lot E ; e-mails partenaires en français.


### H-12 — Traduction automatique des créations
Statut : À tester — Date : —

Une seule saisie (titre + description) dans la langue choisie (« Langue de saisie », défaut = langue de l'interface) ; l'autre langue est traduite à l'enregistrement.
1. `/fr/fournisseur/oeuvres/nouvelle` : un seul titre / une seule description + sélecteur de langue. Enregistrer.
2. Sans clé (ou quota DeepL atteint, ou erreur) : l'enregistrement réussit, aucune traduction, aucun message ; le texte d'origine s'affiche dans les deux langues, sans badge.
3. Avec clé : badge « traduit automatiquement » ; corriger la version de l'autre langue puis enregistrer → badge disparu (version manuelle conservée aux enregistrements suivants).
4. Modifier le titre/la description source → l'autre langue est retraduite (sauf correction manuelle simultanée).
5. Une panne du service de traduction ne bloque jamais l'enregistrement.
- Variable Vercel (optionnelle) : `DEEPL_API_KEY` (DeepL API Free, endpoint api-free.deepl.com ; `DEEPL_API_URL` pour surcharger). Sans elle, pas de traduction.
- Vérif : `npm run db:check-translate`. Limite : bio du profil non traduite automatiquement.


### H-13 — Fiche création d'un partenaire réel
Statut : À tester — Date : —

1. `/fr/produits/<slug>` d'une création publiée par un partenaire : pas de « Prix fictif de démonstration », dimensions sans mention « fictives », « Pièce unique » affiché une seule fois (pas de « Édition Pièce unique »), section « À propos de la création » absente si l'histoire est vide.
2. Les pièces du catalogue de démo historique (« exemple-… ») gardent leurs mentions de démonstration.


### H-14 — Lot D — Paiements (test)
Statut : À tester — Date : —

Mode test : aucun argent réel n'est encaissé ni versé (mention visible sur les pages Paiements / Versements). Le vendeur est la boutique ; la plateforme prélève sa commission.
Registre créé à la livraison (« Marquer livrée ») : montant client = part boutique + commission (taux du partenaire, 15 % par défaut ; modifiable par l'admin, appliqué aux prochaines livraisons). Gain « en attente » pendant `LEDGER_HOLD_DAYS` jours (défaut 7, fenêtre de retour), puis « disponible », puis « versé ».


#### H-15 — Partenaire — `/fr/fournisseur/paiements`
Statut : À tester — Date : —
1. Après une livraison : 3 cartes En attente / Disponible / Versé ; tableau des ventes avec montant client, commission (−x €, taux) et « Votre part ».
2. Mention « Paiement test : aucun argent réel ».


#### H-16 — Admin — `/fr/admin/versements`
Statut : À tester — Date : —
1. Le partenaire apparaît avec ses soldes. Bouton « Rendre disponible (test) » sur un gain en attente (évite d'attendre 7 jours).
2. « Marquer le versement effectué » → solde disponible versé, référence TEST-…, e-mail au partenaire (« versement effectué (test) »).
3. Re-cliquer sans solde → « Aucun solde disponible à verser ».
4. Changer la commission (ex. 25 %) → s'applique aux livraisons suivantes (les entrées existantes gardent leur taux).
5. Côté partenaire : la ligne passe à « Versé » et le versement apparaît dans « Versements ».

- Variable Vercel optionnelle : `LEDGER_HOLD_DAYS` (0 pour disponible immédiatement). Migration 0015 additive (LedgerEntry, Payout).
- Vérif : `npm run db:check-orders` (inclut commission 15 %, attente→disponible→versé, idempotence, versements concurrents).
- Limites : pas de remboursement/retour (écriture annulée au lot E : champ `reversedAt` prévu) ; taux unique par partenaire ; pas d'export/facture (lot H).

### T-CONTACT — Pied de page « Contactez-nous » — 3 min — À tester — date : —
1. Ouvrir epomta.com (écran large), descendre au pied de page. Résultat : une seule carte E-mail « contact@epomta.com », aucune carte téléphone tant que CONTACT_PHONE_LOCAL / CONTACT_PHONE_INTL ne sont pas définies sur Vercel.
2. Pages Aide, CGV, Confidentialité : l'adresse affichée est contact@epomta.com.

### T-COLIS-REMB — Page commande après remboursement — 3 min — À tester — date : —
1. Compte client › Mes commandes, colis au retour remboursé. Résultat : seul le statut du retour s'affiche, plus de « vous pouvez le retourner sous 30 jours » ni de formulaire.

### T-FILTRES-RESET — Réinitialiser et Versements — 5 min — À tester — date : —
1. Sur Admin › Commandes (puis Versements, Retours, Candidatures, Partenaires ; partenaire › Commandes, Paiements), saisir une recherche et des dates, Filtrer, puis « Réinitialiser ». Résultat : champs vides, onglet de statut conservé.
2. Admin › Versements : le texte d'aide du cycle s'affiche sous le titre ; le bouton « Rendre disponible maintenant (ignorer le délai de retour) » demande confirmation (Annuler = rien ne change).

### T-STOCK-UNIQUE — Message de stock unique — 2 min — À tester — date : —
1. Ouvrir une fiche œuvre avec 2 exemplaires, sans taille (ex. /fr/produits/bague-de-marquis-argent-925-355e). Résultat : une seule ligne « Plus que 2 » (sous la description), pas de doublon rouge près du bouton.
2. Fiche avec tailles : l'indication « Plus que n » reste sur la taille concernée uniquement.

### T-MONTANT-EN — Montants et exemple de commande — 3 min — À tester — date : —
1. Annuler un colis avec un compte en anglais (/en). Résultat : l'e-mail « Order cancelled » indique « €55.00 » (pas « 55,00 € »).
2. Pages d'aide Contact FR et EN : l'exemple de n° de commande est « AM-1A2B3C4D ».

### T-DOMAINE — Retour Stripe sur le même domaine — 5 min — À tester — date : —
1. Se connecter en client sur https://epomta-demo.vercel.app, commander (carte test Stripe 4242 4242 4242 4242). Résultat : retour sur epomta-demo.vercel.app/fr/checkout/confirmation/…, toujours connecté.
2. Même parcours sur https://epomta.com : retour sur epomta.com.
3. Sur epomta-demo.vercel.app, ouvrir le compte client : plus d'erreur /api/auth/error?error=Configuration (sinon voir variables Vercel : AUTH_URL).

### T-RACHAT-LIEN — Racheter un article annulé via son lien — 5 min — À tester — date : —
1. Annuler une commande en tant que client, ouvrir l'e-mail « Commande annulée » : cliquer le nom d'un article → fiche produit (FR et EN selon la langue).
2. Sur /fr/account/orders/<numéro> : les noms dans « Suivi par boutique » et « Articles » sont des liens vers la fiche.
3. Pour une pièce vendue ou en rupture : le lien ouvre quand même la fiche, qui indique l'indisponibilité.
(Lien e-mail couvert par A-F12.)

### T-DOMAINE-OFFICIEL — Parcours complet sur epomta.com — 15 min — À tester — date : —
1. Sur https://epomta.com : inscription/connexion client, ajout panier, paiement Stripe (carte test) → retour sur epomta.com, toujours connecté.
2. Ouvrir les e-mails reçus : tous les liens (compte, suivi, articles) pointent vers epomta.com.
3. Connexion Google : OK (après mise à jour de l'URI de redirection).
4. Webhook Stripe : la commande passe à payée sans action manuelle.
(epomta-demo.vercel.app reste réservé aux tests ; liste blanche couverte par A-F11.)

### T-MUR-EPOMTA — Mur d'accès sur epomta.com — 3 min — À tester — date : —
1. Navigation privée, ouvrir https://epomta.com puis https://www.epomta.com : la page de mot de passe s'affiche (aucune œuvre visible).
2. Ouvrir https://epomta.com/robots.txt : « Disallow: / ».
3. Saisir le mot de passe : accès au site ; refaire sur epomta-demo.vercel.app : le mot de passe est redemandé (cookie propre à chaque domaine).
(Couvert aussi par A-F13.)
