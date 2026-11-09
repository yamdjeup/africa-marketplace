# Points à faire valider — E póm ta’

Statut : À faire / En cours / Validé. Responsables suggérés : Juriste, DPO, Finance, Produit, Dev.

## 1. Juridique

| Point | Contexte | Risque | Action recommandée | Responsable | Statut |
|---|---|---|---|---|---|
| Identité du responsable de traitement | Raison sociale, adresse, SIREN absents des pages légales | Non-conformité LCEN/RGPD | Renseigner les mentions légales et la politique de confidentialité | Juriste | À faire |
| CGV colis / retours multi-partenaires | Une commande peut compter plusieurs colis ; retours et remboursements traités par colis, contrat avec chaque partenaire | Qualification du vendeur, information précontractuelle | Faire relire les CGV, Retours, FAQ (FR+EN) | Juriste | À faire |
| Rétractation 14 j et exclusion des pièces sur mesure | Pages Retours et CGV | Exclusion mal formulée | Valider le texte et les cas d'exception | Juriste | À faire |
| Retours sous 30 j | Politique commerciale au-delà du délai légal | Engagement contractuel | Confirmer la politique et les conditions (non porté, emballage) | Juriste / Produit | À faire |
| Frais de port non remboursés au retour | Sauf article défectueux ou non conforme | Contestation consommateur | Valider la mention | Juriste | À faire |
| Durées de conservation (10 ans comptable, 3 ans prospects) | Politique de confidentialité | Durées non justifiées | Confirmer chaque durée et sa base | Juriste / DPO | À faire |
| Âge minimal 15 ans | Politique de confidentialité | Seuil de consentement numérique | Confirmer le seuil | Juriste | À faire |
| Représentant dans l'UE | Section omise ou à confirmer selon l'établissement | Obligation art. 27 RGPD | Déterminer si requis | Juriste / DPO | À faire |

## 2. Paiement / remboursement

| Point | Contexte | Risque | Action recommandée | Responsable | Statut |
|---|---|---|---|---|---|
| Délais annoncés : préparation 2 j ouvrés, remboursement 14-21 j (annulation) / ~14 j (retour) | Textes d'aide et CGV | Promesses non tenues | Valider avec les partenaires et la finance | Finance / Produit | À faire |
| Remboursement à l'annulation | Remboursement Stripe automatique (API, idempotent par colis) si la commande porte un `stripePaymentIntentId` et que `STRIPE_SECRET_KEY` est définie ; sinon statut « remboursement à traiter » (admin). Aucun code n'enregistre encore le paiement Stripe à la commande (checkout) : le champ reste vide tant que ce n'est pas branché | Remboursement oublié ou en retard ; échec Stripe | Brancher l'enregistrement du PaymentIntent au checkout, définir le process admin pour les statuts MANUAL/FAILED | Finance / Dev | À faire |
| 3D Secure / Stripe | Mentionné dans la page Paiement | Texte à aligner sur la config Stripe réelle | Vérifier la configuration et le texte | Dev / Finance | À faire |
| Paiement Stripe Checkout (lot 0) | Commande créée « en attente » puis confirmée par webhook ; stock réservé tant que non payé, sans libération automatique des sessions abandonnées | Stock bloqué par paiements abandonnés ; webhook non configuré = e-mails jamais envoyés | Déclarer le webhook et STRIPE_WEBHOOK_SECRET sur Vercel ; décider d'un délai de libération du stock | Dev / Finance | À faire |

## 3. Livraison / transporteurs

| Point | Contexte | Risque | Action recommandée | Responsable | Statut |
|---|---|---|---|---|---|
| Signature transporteur et non-remise | Signature recueillie par le transporteur ; nouvelle présentation ou retour à l'expéditeur ; frais « selon les conditions du transporteur » | Promesse imprécise | Valider avec les transporteurs (UPS, DHL…) | Juriste / Produit | À faire |
| Frais et délais par colis non connus | Aucune donnée de frais ni de délai par envoi ; seule la préparation sous 2 j ouvrés est indiquée | Information avant paiement incomplète | Définir la source de données par partenaire | Produit / Dev | À faire |
| Calcul des frais de port (fixe ou calculé) | Aucun modèle de frais dans le code | Affichage des frais avant paiement | Décider : forfait, barème ou calcul transporteur | Produit | À décider |
| Option livraison offerte | Retirée de l'application | Cohérence commerciale | Décider d'une éventuelle offre | Produit | À décider |
| Suivi de livraison | Transporteur (UPS, DHL, Colissimo, autre) et n° saisis par le créateur ; lien vers la page du transporteur (aucun appel API) ; saisie côté admin non ajoutée | URL de suivi à vérifier ; transporteur « autre » sans lien | Valider les URL et le besoin de saisie admin | Produit / Dev | À faire |

## 4. Cookies / RGPD

| Point | Contexte | Risque | Action recommandée | Responsable | Statut |
|---|---|---|---|---|---|
| GA4 : base légale | Consentement via bandeau | Mesure sans consentement valide | Valider le consentement comme seule base | DPO | À faire |
| Transfert vers les États-Unis | Google LLC ; clauses contractuelles types | Garanties insuffisantes | Vérifier les CCT / cadre applicable | DPO | À faire |
| Textes cookies (_ga, _ga_*) et durée 13 mois | Pages Cookies et Confidentialité | Description inexacte | Relire face à l'implémentation | DPO | À faire |
| Pas de refus implicite | Refuser aussi simple qu'accepter ; aucun script avant choix | Non-conformité CNIL | Tester le bandeau FR+EN | DPO / Dev | À faire |
| Autorité de contrôle (CNIL) | Mentionnée pour les réclamations | Autorité compétente | Confirmer | DPO | À faire |
| NEXT_PUBLIC_GA_ID à configurer sur Vercel | Sans la variable, aucun script n'est chargé | Pas de mesure | Renseigner la variable en production | Dev | À faire |

## 5. Produit / technique

| Point | Contexte | Risque | Action recommandée | Responsable | Statut |
|---|---|---|---|---|---|
| Parcours e2e | Tests e2e non exécutés localement (pas de base de données) | Régressions non détectées | Exécuter la suite en CI | Dev | À faire |
| Annulation par colis | Contrôle du propriétaire et du statut côté serveur | Cas limites | Test manuel anti-course (deux onglets) | Dev / QA | À faire |
