# Recette — espace partenaires et commandes (mode test)

Complété à chaque lot. Aucun argent réel : seul le registre des paiements (lot D) est en mode test.

## Comptes
| Rôle | Compte |
|---|---|
| Admin | compte dont l'e-mail est dans `ADMIN_EMAILS` (Vercel) |
| Candidat / partenaire | un 2e compte client (autre e-mail), ou le même sans rôle admin |
| Partenaires de démo | KeNoF, Nathalie Morère, Cruzz Taylor (lignes en base, via `npm run db:seed-suppliers`) |

## Lot A — Candidature et validation admin
URLs (remplacer `fr` par `en` pour l'anglais) : `/fr/fournisseur`, `/fr/fournisseur/candidature`, `/fr/admin/candidatures`, `/fr/admin/fournisseurs`, `/fr/account`.

- [ ] Visiteur non connecté sur `/fr/fournisseur/candidature` : invité à se connecter.
- [ ] Visiteur sur `/fr/fournisseur/tableau-de-bord` : redirigé vers la connexion.
- [ ] Client connecté (non partenaire) sur le tableau de bord partenaire : redirigé vers la candidature.
- [ ] Client sur `/fr/admin` : renvoyé à l'accueil.
- [ ] Client remplit et envoie la candidature : message « Candidature envoyée ». **E-mail** de confirmation au candidat ; **e-mail** à l'admin.
- [ ] Renvoyer une 2e candidature en attente : message « déjà en cours d'examen ».
- [ ] Candidature sans lien ET sans fichier : refusée avec message clair (« lien OU fichier »).
- [ ] Candidature sans lien mais avec 1 à 5 fichiers (JPG/PNG/WebP/PDF, 4 Mo max chacun) : miniatures affichées, suppression possible, envoi accepté.
- [ ] Fichier .exe/.txt renommé en .jpg, ou > 4 Mo : refusé. 6e fichier : refusé.
- [ ] Admin : la fiche candidature montre les miniatures (clic = agrandi) et les PDF (téléchargeables) ; un autre client ne peut pas ouvrir ces fichiers.
- [ ] Admin, `/fr/admin/candidatures` : la candidature apparaît « À traiter ».
- [ ] Admin « Demander des infos » (avec message) : statut mis à jour ; **e-mail** au candidat ; le candidat voit la note et peut renvoyer.
- [ ] Admin « Refuser » : **e-mail** de refus.
- [ ] Admin « Accepter » : **e-mail** de bienvenue ; le candidat accède à `/fr/fournisseur/tableau-de-bord`.
- [ ] Partenaire : modifier le profil (nom, pays, bio, vidéo) puis recharger : valeurs conservées.
- [ ] Admin, `/fr/account` : bloc « Vue (admin) » (absent pour un non-admin).
- [ ] Admin : choisir un partenaire de démo puis « Ouvrir la vue Partenaire » : espace affiché en lecture seule (bandeau « Vue admin »), « Quitter » ramène au compte.
- [ ] Un admin ne peut pas ouvrir l'espace d'un vrai partenaire (seules les démos sont proposées).

## Lot B — Œuvres et stock

Prérequis : `npm run db:seed-suppliers` (partenaires de démo avec œuvres, variantes et une œuvre à modérer) ; `npm run db:check-stock` (vérification automatique du stock, dont la concurrence sur la dernière pièce). Variable Vercel optionnelle : `BLOB_READ_WRITE_TOKEN` (non utilisée pour l'instant : photos stockées en base, ≤ 300 Ko ; interface `PhotoStorage` dans `src/lib/storage.ts` à brancher sur Vercel Blob).

Comptes : partenaire actif (accepté au lot A), admin (`ADMIN_EMAILS`), client.

### Partenaire — `/fr/fournisseur/oeuvres`
- [ ] Menu « Œuvres et stock » ; liste vide au début ; bouton « Ajouter une œuvre ».
- [ ] Nouvelle œuvre : titres FR/EN, description (≥ 20 car. pour soumettre), catégorie, prix + devise (XOF, XAF, USD…), dimensions, poids, 1 à 6 photos (compressées auto, 1re = couverture, suppression possible).
- [ ] Stock initial : quantité, case « Pièce unique » (= 1), ou variantes (« S: 3 » une par ligne).
- [ ] Catégorie peinture/sculpture/photographie : bloc facultatif Édition, photo de signature, case « Je certifie être l'auteur » (horodatée). Aucun bloc pour la mode.
- [ ] « Enregistrer le brouillon » → statut Brouillon ; « Enregistrer et soumettre » → En modération. E-mail attendu côté admin (« Œuvre à modérer »).
- [ ] Profil : signature dessinée ou téléversée, enregistrée une seule fois.
- [ ] Fiche œuvre, section Stock : entrée de stock, correction (refusée si elle passe sous le réservé), nouvelle variante ; historique des mouvements avec date, type, quantité, motif, auteur.
- [ ] Un partenaire ne voit/modifie jamais les œuvres d'un autre (URL directe → 404).

### Admin — `/fr/admin/oeuvres`
- [ ] File des œuvres soumises avec photos, prix, stock, attestation/édition ; « Publier » ou « Refuser » (motif obligatoire). E-mail au partenaire dans les deux cas.
- [ ] Œuvre publiée → visible dans le catalogue et sur la fiche de l'artiste ; refusée → corrigeable puis re-soumettable.
- [ ] Derniers mouvements de stock visibles.

### Client
- [ ] Fiche produit : « Pièce unique » (stock 1), « Plus que 2/3 », « En stock », « Épuisé » (non achetable) ; variantes épuisées barrées.
- [ ] Achat de la dernière pièce : le stock est réservé (disponible 0, œuvre « Épuisé » en catalogue) ; un second client reçoit une erreur de stock.
- [ ] Stock bas : après l'achat, e-mail « stock bas » au partenaire si le disponible passe sous son seuil.
- [ ] Confirmation à l'expédition, libération au refus/expiration/annulation, retour de stock : lot C.

## Suspension / révocation d'un partenaire (`/fr/admin/fournisseurs`)
Migration additive 0012 (`PartnerAudit`). Les partenaires de démo ne sont pas concernés.
- [ ] Admin : « Gérer l'accès » sur un vrai partenaire ; « Suspendre » sans motif → erreur ; avec motif → statut Suspendu, e-mail au partenaire, entrée au journal d'audit (qui/quand/pourquoi).
- [ ] Partenaire suspendu : `/fr/fournisseur` n'ouvre plus le portail ; ses œuvres publiées disparaissent du catalogue (statut « Masquée »).
- [ ] « Réactiver » : accès et œuvres rétablis, e-mail envoyé.
- [ ] « Révoquer définitivement » : motif + case de confirmation obligatoires ; refusé tant qu'une œuvre a du stock réservé (commande en cours) ; option « Anonymiser le profil » (nom, bio, vidéo, signature effacés ; commandes et paiements conservés). Aucune suppression physique.

## Lot C — Commandes par partenaire
Migration additive 0013 (`SubOrder`, `OrderItem.subOrderId`). Vérification automatique : `npm run db:check-orders` (scission, autorisations, 48 h, relance/escalade/expiration, libération et confirmation du stock). Variables : `CRON_SECRET` (cron `/api/orders/sweep`, quotidien sur Vercel Hobby ; le balayage tourne aussi au chargement des pages Commandes et après chaque commande), `ADMIN_EMAILS`, e-mail existant.
Comptes : client (ou invité), partenaire actif (ex. compte accepté au lot A avec une œuvre publiée au lot B), admin (`ADMIN_EMAILS`).

### Client — achat
- [ ] Acheter 2 œuvres de 2 partenaires différents (panier → paiement test). Page de confirmation et `/fr/account/orders/<n°>` : un bloc « Vendu et expédié par [boutique] (pays) » par partenaire, état « À accepter », mention « E póm ta’ est l'intermédiaire ».
- [ ] Stock : l'œuvre est réservée (disponible −1). E-mail « nouvelle commande » à chaque partenaire (échéance 48 h).

### Partenaire — `/fr/fournisseur/commandes`
- [ ] Tableau de bord : compteurs « À accepter », « À préparer / expédier », « En livraison ». Liste filtrable (À accepter, À expédier, Expédiées, Clôturées) ; un partenaire ne voit que ses sous-commandes (URL d'un autre → 404).
- [ ] Ouvrir la commande : articles, adresse de livraison, échéance. « Accepter » → état Acceptée, e-mail au client.
- [ ] « Marquer en préparation » puis « Marquer expédiée » : transporteur et suivi obligatoires. Stock confirmé (mouvement « Vente » dans l'historique de l'œuvre, stock physique −1, réservé −1). E-mail au client avec le suivi.
- [ ] « Marquer livrée » → e-mail au client ; le client voit « Livrée ».
- [ ] Refus : refuser avec motif (obligatoire) → commande annulée, stock libéré (mouvement « Libération »), e-mail au client. La pièce unique redevient achetable.

### 48 h, relance, escalade
- [ ] Sans réponse : relance e-mail au partenaire à 24 h, e-mail d'escalade aux admins à 36 h (et badge « Sans réponse » dans `/fr/admin/commandes`), annulation automatique à 48 h (stock libéré, client prévenu). Pour tester sans attendre : `npm run db:check-orders` simule ces délais ; en manuel, appeler `/api/orders/sweep` avec `Authorization: Bearer <CRON_SECRET>`.

### Admin — `/fr/admin/commandes`
- [ ] Toutes les sous-commandes avec boutique, état, suivi. « Annuler et libérer le stock » (motif obligatoire) sur une commande non expédiée → client prévenu.
- [ ] Suspension/révocation : la révocation est refusée tant que le partenaire a des commandes ouvertes.
- [ ] « Voir comme » un partenaire de démo : commandes en lecture seule.

Limites : paiement = test (aucun débit) ; retour/litige et retour de stock après livraison au lot E ; e-mails partenaires en français.

## Traduction automatique des œuvres

Une seule saisie (titre + description) dans la langue choisie (« Langue de saisie », défaut = langue de l'interface) ; l'autre langue est traduite à l'enregistrement.
- [ ] `/fr/fournisseur/oeuvres/nouvelle` : un seul titre / une seule description + sélecteur de langue. Enregistrer.
- [ ] Sans clé (ou quota DeepL atteint, ou erreur) : l'enregistrement réussit, aucune traduction, aucun message ; le texte d'origine s'affiche dans les deux langues, sans badge.
- [ ] Avec clé : badge « traduit automatiquement » ; corriger la version de l'autre langue puis enregistrer → badge disparu (version manuelle conservée aux enregistrements suivants).
- [ ] Modifier le titre/la description source → l'autre langue est retraduite (sauf correction manuelle simultanée).
- [ ] Une panne du service de traduction ne bloque jamais l'enregistrement.
- Variable Vercel (optionnelle) : `DEEPL_API_KEY` (DeepL API Free, endpoint api-free.deepl.com ; `DEEPL_API_URL` pour surcharger). Sans elle, pas de traduction.
- Vérif : `npm run db:check-translate`. Limite : bio du profil non traduite automatiquement.

## Lot D — Paiements (test)

Mode test : aucun argent réel n'est encaissé ni versé (mention visible sur les pages Paiements / Versements). Le vendeur est la boutique ; la plateforme prélève sa commission.
Registre créé à la livraison (« Marquer livrée ») : montant client = part boutique + commission (taux du partenaire, 15 % par défaut ; modifiable par l'admin, appliqué aux prochaines livraisons). Gain « en attente » pendant `LEDGER_HOLD_DAYS` jours (défaut 7, fenêtre de retour), puis « disponible », puis « versé ».

### Partenaire — `/fr/fournisseur/paiements`
- [ ] Après une livraison : 3 cartes En attente / Disponible / Versé ; tableau des ventes avec montant client, commission (−x €, taux) et « Votre part ».
- [ ] Mention « Paiement test : aucun argent réel ».

### Admin — `/fr/admin/versements`
- [ ] Le partenaire apparaît avec ses soldes. Bouton « Rendre disponible (test) » sur un gain en attente (évite d'attendre 7 jours).
- [ ] « Marquer le versement effectué » → solde disponible versé, référence TEST-…, e-mail au partenaire (« versement effectué (test) »).
- [ ] Re-cliquer sans solde → « Aucun solde disponible à verser ».
- [ ] Changer la commission (ex. 25 %) → s'applique aux livraisons suivantes (les entrées existantes gardent leur taux).
- [ ] Côté partenaire : la ligne passe à « Versé » et le versement apparaît dans « Versements ».

- Variable Vercel optionnelle : `LEDGER_HOLD_DAYS` (0 pour disponible immédiatement). Migration 0015 additive (LedgerEntry, Payout).
- Vérif : `npm run db:check-orders` (inclut commission 15 %, attente→disponible→versé, idempotence, versements concurrents).
- Limites : pas de remboursement/retour (écriture annulée au lot E : champ `reversedAt` prévu) ; taux unique par partenaire ; pas d'export/facture (lot H).
