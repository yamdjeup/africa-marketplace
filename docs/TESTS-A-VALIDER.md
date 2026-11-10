# Tests à valider — E póm ta’

Mis à jour à chaque lot (même commit). Statut : Testé (validé par l'utilisateur) / À tester. Les cases historiques détaillées (lots A à D, traduction, fiche création) sont dans `docs/TEST-PARTENAIRES.md` : tous À tester sauf indication contraire. Comptes : Client (compte client), Créateur (partenaire actif), Admin (e-mail dans `ADMIN_EMAILS`).

## Lots récents

| ID | Lot | Durée | Statut | Date |
|---|---|---|---|---|
| T-GA4 | GA4 + consentement | 15 min | À tester | — |
| T-COLIS | Multi-colis + annulation | 20 min | À tester | — |
| T-SUIVI | Suivi de livraison + remboursement (lots 1–2) | 15 min | À tester | — |
| T-MAILS | E-mails Farfetch | 10 min | À tester | — |
| T-AIDE | Pages d'aide FR/EN | 10 min | À tester | — |
| T24 | Parcours de commande complet (achat → livraison) | 20 min | À tester | — |
| T-STRIPE | Paiement Stripe Checkout + webhook (lot 0) | 15 min | À tester | — |
| T-REMB | Remboursement au refus/expiration/annulation | 15 min | À tester | — |
| T-HIST | Lots A à D, traduction, fiche création | 60 min | À tester | voir TEST-PARTENAIRES.md |

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
1. Passer une commande : e-mail « reçue » centré, logo, titre en majuscules, vignette, taille (× 1 · M), total, adresse, aide, pied.
2. Marquer expédié : e-mail « en route » avec bouton « Suivre ma commande », adresse, « Colis X sur N ».
3. Marquer livré : bouton « Voir ma commande ».
4. Vérifier : aucune mention démo/fictif/simulé, pas de « Livraison : Offerte », nom propre du créateur, rendu mobile.

### T-STRIPE — paiement Stripe (lot 0)
Prérequis : migration 0021 appliquée ; clés Stripe de test ; webhook `/api/stripe/webhook` (événement checkout.session.completed) déclaré dans Stripe avec STRIPE_WEBHOOK_SECRET.
1. Sans STRIPE_SECRET_KEY : passer commande, confirmation et e-mails immédiats comme avant.
2. Avec les clés : Client, panier, « Commander » : redirection vers la page Stripe, montant correct.
3. Payer avec la carte de test 4242 4242 4242 4242 : retour sur la confirmation de commande.
4. Vérifier : e-mail « reçue » et notification au créateur arrivent après le paiement (webhook), une seule fois.
5. En base : `stripePaymentIntentId` renseigné, `paymentPending` = false.
6. Abandonner sur la page Stripe : aucun e-mail envoyé, commande en attente de paiement.
7. Annuler ensuite un colis payé : remboursement Stripe automatique (voir T-SUIVI).
8. Webhook avec signature invalide (curl) : réponse 400.

### T-REMB — remboursement au refus / expiration / annulation
Prérequis : migration 0022 ; STRIPE_SECRET_KEY de test ; commande payée via Stripe.
1. Client : commande payée (carte 4242…), webhook reçu (`stripePaymentIntentId` renseigné).
2. Créateur : refuser le colis avec un motif. Résultat : Stripe > Paiements > Refund créé (montant du colis), `refundStatus` = DONE.
3. Compte client : « le remboursement a été effectué ».
4. Refaire avec annulation client, puis annulation admin : même résultat.
5. Colis sans réponse 48 h (expiré) : remboursement créé au passage du cron.
6. Refuser un colis avant le webhook (paiement non confirmé) : `refundStatus` = AWAITING ; renvoyer le webhook : remboursement créé.
7. Clé Stripe invalide : `refundStatus` = FAILED, `refundNote` explicite, ligne `[refund]` dans les logs Vercel.
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
