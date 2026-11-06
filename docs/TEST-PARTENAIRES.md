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
- [ ] Candidature sans lien mais avec 1 à 5 fichiers (JPG/PNG/WebP/PDF, 4 Mo max chacun) : miniatures affichées, suppression possible, envoi accepté. Les erreurs sont explicites (trop lourd, format, session expirée, erreur serveur, code HTTP). Prérequis Neon : migrations appliquées jusqu'à `0010_application_files` (table `ApplicationFile`) ; sans elle l'envoi échoue avec « Erreur du serveur… ».
- [ ] Fichier .exe/.txt renommé en .jpg, ou > 4 Mo : refusé. 6e fichier : refusé.
- [ ] Admin : la fiche candidature montre les miniatures (clic = agrandi) et les PDF (téléchargeables) ; un autre client ne peut pas ouvrir ces fichiers.
- [ ] Admin, `/fr/admin/candidatures` : la candidature apparaît « À traiter ».
- [ ] Admin « Demander des infos » (avec message) : statut mis à jour ; **e-mail** au candidat ; le candidat voit la note et peut renvoyer.
- [ ] Admin « Refuser » : **e-mail** de refus.
- [ ] Admin « Accepter » : **e-mail** de bienvenue ; le candidat accède à `/fr/fournisseur/tableau-de-bord`.
- [ ] Partenaire : modifier le profil (nom, pays, bio, vidéo) puis recharger : valeurs conservées.
- [ ] Admin, `/fr/account` : plus de bloc « Vue (admin) » ; l'accès se fait par les lignes « Administration » / « Mon espace partenaire » de « Mon compte ».
- [ ] Admin : `/fr/admin/fournisseurs`, « Voir son espace » sur un partenaire de démo : espace affiché en lecture seule (bandeau « Vue admin »), « Quitter » ferme la vue.
- [ ] Un admin ne peut pas ouvrir l'espace d'un vrai partenaire (seules les démos sont proposées).

## Lot B — Créations et stock

Prérequis : `npm run db:seed-suppliers` (partenaires de démo avec créations, variantes et une création à modérer) ; `npm run db:check-stock` (vérification automatique du stock, dont la concurrence sur la dernière pièce). Variable Vercel optionnelle : `BLOB_READ_WRITE_TOKEN` (non utilisée pour l'instant : photos stockées en base, ≤ 300 Ko ; interface `PhotoStorage` dans `src/lib/storage.ts` à brancher sur Vercel Blob).

Comptes : partenaire actif (accepté au lot A), admin (`ADMIN_EMAILS`), client.

### Partenaire — `/fr/fournisseur/oeuvres`
- [ ] Menu « Créations et stock » ; liste vide au début ; bouton « Ajouter une création ».
- [ ] Nouvelle création : titres FR/EN, description (≥ 20 car. pour soumettre), catégorie, prix + devise (XOF, XAF, USD…), dimensions, poids, 1 à 6 photos (compressées auto, 1re = couverture, suppression possible).
- [ ] Stock initial : quantité, case « Pièce unique » (= 1), ou variantes (« S: 3 » une par ligne).
- [ ] Catégorie peinture/sculpture/photographie : bloc facultatif Édition, photo de signature, case « Je certifie être l'auteur » (horodatée). Aucun bloc pour la mode.
- [ ] « Enregistrer le brouillon » → statut Brouillon ; « Enregistrer et soumettre » → En modération. E-mail attendu côté admin (« Création à modérer »).
- [ ] Profil : signature dessinée ou téléversée, enregistrée une seule fois.
- [ ] Fiche création, section Stock : entrée de stock, correction (refusée si elle passe sous le réservé), nouvelle variante ; historique des mouvements avec date, type, quantité, motif, auteur.
- [ ] Un partenaire ne voit/modifie jamais les créations d'un autre (URL directe → 404).

### Admin — `/fr/admin/oeuvres`
- [ ] File des créations soumises avec photos, prix, stock, attestation/édition ; « Publier » ou « Refuser » (motif obligatoire). E-mail au partenaire dans les deux cas.
- [ ] Admin `/fr/admin/oeuvres` : onglets En attente (défaut) / Publiées / Refusées / Toutes avec compteurs ; chaque création montre badge de statut, partenaire, date de décision et motif si refusée ; Publier/Refuser seulement en attente, Refuser (motif) possible sur une publiée ; une création traitée ne disparaît plus. Côté partenaire `/fr/fournisseur/oeuvres` : badges « En modération », « Publiée », « Refusée » (+ motif). Migration additive 0016 (`Product.decidedAt`) à appliquer sur Neon.
- [ ] Admin saisit au nom d'un partenaire : `/fr/admin/fournisseurs` → bouton « Gérer les créations » visible seulement pour un partenaire ACTIF non démo (absent si suspendu/révoqué) → liste de ses créations → « Nouvelle création au nom du partenaire » : même formulaire, boutons Brouillon / « Envoyer en modération » / « Publier directement » (publiée = visible au catalogue, date de décision renseignée). Création marquée « Saisie par l'administration » (liste du partenaire et `/admin/oeuvres`) ; historique de stock : « Stock initial — créé par l'admin pour le compte de <partenaire> » (auteur = e-mail admin). Section art : signature/attestation non proposées à l'admin, le partenaire les complète dans son espace. La création est visible et modifiable dans `/fr/fournisseur/oeuvres` (photos saisies par l'admin conservées) ; commission 15 %, stock et commandes inchangés. Un non-admin qui poste `asSupplier` est redirigé (droits : ADMIN_EMAILS). Migration additive 0017 (`Product.createdByAdmin`) à appliquer sur Neon.
- [ ] Admin `/fr/admin/oeuvres` en tableaux (25/page) : onglets En attente / Publiées / Refusées / Toutes avec compteurs qui respectent les filtres ; colonnes photo, partenaire, création, catégorie, prix (€), stock, description tronquée (infobulle), statut, décision (jj/mm/aaaa hh:mm, « — » si absente), motif (Refusées/Toutes), badge « Saisie par l'administration », actions. Filtre date (défaut Aujourd'hui, 7 j, 30 j, plage, Toutes les dates = inclut décisions sans date) ; En attente n'est jamais filtré par date (sélecteur grisé avec explication), et « Toutes » = en attente + publiées/refusées filtrées par date (compteur Toutes = somme des trois) ; message « N création(s) masquée(s) par le filtre de date » + lien « Voir toutes les dates » (décisions sans date incluses). Recherche, partenaire, catégorie, tri (partenaire, prix, décision) conservés dans l'URL ; Export CSV de la vue filtrée (admin uniquement, 403 sinon) ; cases + « Publier/Refuser la sélection » avec motif commun (refus sans motif refusé) ; état vide ; défilement horizontal à 390 px ; journal de stock paginé. Clic sur la photo = visionneuse (Échap, clic extérieur, bouton ×, précédent/suivant, balayage tactile), aussi dans `/fr/fournisseur/oeuvres`.
- [ ] Admin `/fr/admin/oeuvres` colonne « En attente depuis » (En attente et Toutes) : date/heure de soumission + durée (« 2 h », « 3 j »), orange > 24 h, rouge > 72 h (constantes `WAIT_WARN_H`/`WAIT_ALERT_H`), tri par colonne (défaut En attente : plus ancienne d'abord), « la plus ancienne en attente : X » en tête, colonnes dans le CSV. Migration 0018 (backfill `submittedAt = createdAt`) à appliquer sur Neon.
- [ ] Filtre de date : Du/Au reflètent la période (Aujourd'hui = jour/jour ; 7 jours = aujourd'hui−6 → aujourd'hui ; 30 jours idem ; Toutes les dates = champs vides) ; changer le sélecteur met à jour Du/Au sans rechargement puis applique le filtre ; modifier Du ou Au bascule sur « Plage personnalisée » ; Du > Au = message d'erreur (champs bornés min/max, URL inversée corrigée côté serveur) ; bornes en heure de Europe/Paris.
- [ ] Liens vers la fiche : sur /admin/oeuvres, le titre d'une création publiée ouvre /produits/<slug> dans un nouvel onglet (↗, info-bulle « Ouvrir la fiche publique ») ; en attente/refusée = texte + lien « Voir côté partenaire » ; même lien dans le journal de stock et dans « Créations et stock » (publiées seulement).
- [ ] Barre admin sur la fiche publique (visible uniquement pour un admin) : Retour à la modération / Refuser / Modifier.
- [ ] Plage personnalisée avec seulement Du : les décisions sans date (avant 0016) n'apparaissent pas ; elles n'apparaissent que sous « Toutes les dates ».
- [ ] URL propre (migration 0019 à appliquer sur Neon) : la page boutique d'un partenaire est /partenaires/<nom-nettoyé> (ex. /fr/partenaires/lolipat), suffixe -xxxx seulement en cas de doublon. Anciennes URL : /fr/createurs/... → 308 vers /fr/partenaires/... ; un ancien slug renommé (ex. lolipat-341c) → 308 vers le nouveau slug (table CreatorSlugAlias). Les liens du menu, pied de page, accueil, catalogue, recherche et fiches pointent sur /partenaires.
- [ ] Photo de profil : Espace partenaire > Profil > « Photo de profil » (≤ 300 Ko) ; après enregistrement, elle s'affiche sur la page boutique, les cartes et l'accueil. Sans photo : médaillon doré avec les initiales (ex. « LP »).
- [ ] Espace partenaire > Créations et stock = tableau (photo+lightbox, création avec ↗ si publiée, catégorie, prix €, stock, statut, motif de refus, « En attente depuis » orange > 24 h / rouge > 72 h, décision, Modifier / Ajuster le stock). Onglets avec compteurs : Toutes / En modération / Publiées / Refusées / Brouillons / Stock bas ; recherche, catégorie, statut, tri par colonne, pagination 25, Export CSV (mes-creations.csv) de la vue filtrée. Vérifier qu'un partenaire ne voit jamais les créations d'un autre (liste, CSV, journal). Journal de stock du partenaire paginé. Mobile 390 px : défilement horizontal.
- [ ] Terminologie : « œuvre » est remplacé par « création » partout dans l'UI, les e-mails, le CSV (`creations.csv`) et cette recette (FR) ; « Creation(s) » en EN ; URL `/oeuvres` inchangées ; « œuvre d'art » conservé pour l'authenticité/signature ; « Pièce unique » inchangé.
- [ ] Création publiée → visible dans le catalogue et sur la fiche de l'artiste ; refusée → corrigeable puis re-soumettable ; dans la liste `/fr/fournisseur/oeuvres`, le motif du refus s'affiche sous le badge « Refusée » (2 lignes max, rouge discret).
- [ ] Derniers mouvements de stock visibles.

### Client
- [ ] Fiche produit : « Pièce unique » (stock 1), « Plus que 2/3 », « En stock », « Épuisé » (non achetable) ; variantes épuisées barrées.
- [ ] Achat de la dernière pièce : le stock est réservé (disponible 0, création « Épuisé » en catalogue) ; un second client reçoit une erreur de stock.
- [ ] Stock bas : après l'achat, e-mail « stock bas » au partenaire si le disponible passe sous son seuil.
- [ ] Confirmation à l'expédition, libération au refus/expiration/annulation, retour de stock : lot C.

## Suspension / révocation d'un partenaire (`/fr/admin/fournisseurs`)
Migration additive 0012 (`PartnerAudit`). Les partenaires de démo ne sont pas concernés.
- [ ] Admin : sur un vrai partenaire, une seule ligne : champ « Motif » + liste « Action » (Actif : Suspendre/Révoquer ; Suspendu : Réactiver/Révoquer) + « Valider ». Sans motif (Suspendre/Révoquer) → blocage du formulaire ; avec motif → popup « Confirmer la suspension ? » (Oui/Non) ; « Non » n'exécute rien ; « Oui » → statut Suspendu, e-mail au partenaire, entrée au journal d'audit.
- [ ] Chaque ligne affiche « Partenaire depuis le JJ/MM/AAAA » ; le journal (tableau date, partenaire, action, motif, auteur), groupé par partenaire en ordre chronologique, contient « Création du compte partenaire (candidature acceptée) » (y compris pour les anciens), puis chaque Suspension, Réactivation, Révocation avec date/heure, motif et auteur.
- [ ] `/fr/fournisseur/candidature` : pour un partenaire existant (actif, suspendu ou révoqué) le titre est « Mon espace partenaire » (EN « My partner space ») et aucun formulaire de candidature n'apparaît ; « Candidature partenaire » + formulaire uniquement pour un utilisateur sans partenaire.
- [ ] `/fr/account` : en tête de « Mon compte », une ligne « Mon espace partenaire » (›) pour un partenaire actif, suspendu ou révoqué (suspendu → message de suspension) et une ligne « Administration » (›) pour les ADMIN_EMAILS ; un client simple ne voit ni l'une ni l'autre. FR/EN, mobile 390 px et bureau.
- [ ] Partenaire suspendu : `/fr/fournisseur` et le tableau de bord mènent à la page candidature avec « Votre espace partenaire est suspendu. », le motif et un lien « Contactez-nous », sans « Y accéder » ; portail bloqué. Idem « Votre accès partenaire a été révoqué. » après révocation. FR/EN, lisible à 390 px. Après réactivation : « Votre espace partenaire est ouvert. Y accéder » et accès normal.
- [ ] Partenaire suspendu : `/fr/fournisseur` n'ouvre plus le portail ; ses créations publiées disparaissent du catalogue (statut « Masquée »).
- [ ] « Réactiver » (motif facultatif, popup « Confirmer la réactivation ? ») : accès et créations rétablis, e-mail envoyé.
- [ ] « Révoquer définitivement » : motif obligatoire, popup « Confirmer la révocation définitive ? » avec case « Anonymiser le profil » (décochée par défaut) ; refusé tant qu'une création a du stock réservé (commande en cours) ; anonymisation : nom, bio, vidéo, signature effacés ; commandes et paiements conservés. Aucune suppression physique.

## Lot C — Commandes par partenaire
Migration additive 0013 (`SubOrder`, `OrderItem.subOrderId`). Vérification automatique : `npm run db:check-orders` (scission, autorisations, 48 h, relance/escalade/expiration, libération et confirmation du stock). Variables : `CRON_SECRET` (cron `/api/orders/sweep`, quotidien sur Vercel Hobby ; le balayage tourne aussi au chargement des pages Commandes et après chaque commande), `ADMIN_EMAILS`, e-mail existant.
Comptes : client (ou invité), partenaire actif (ex. compte accepté au lot A avec une création publiée au lot B), admin (`ADMIN_EMAILS`).

### Client — achat
- [ ] Acheter 2 créations de 2 partenaires différents (panier → paiement test). Page de confirmation et `/fr/account/orders/<n°>` : un bloc « Vendu et expédié par [boutique] (pays) » par partenaire, état « À accepter », mention « E póm ta’ est l'intermédiaire ».
- [ ] Stock : la création est réservée (disponible −1). E-mail « nouvelle commande » à chaque partenaire (échéance 48 h).

### Partenaire — `/fr/fournisseur/commandes`
- [ ] Tableau de bord : compteurs « À accepter », « À préparer / expédier », « En livraison ». Liste filtrable (À accepter, À expédier, Expédiées, Clôturées) ; un partenaire ne voit que ses sous-commandes (URL d'un autre → 404).
- [ ] Ouvrir la commande : articles, adresse de livraison, échéance. « Accepter » → état Acceptée, e-mail au client.
- [ ] « Marquer en préparation » puis « Marquer expédiée » : transporteur et suivi obligatoires. Stock confirmé (mouvement « Vente » dans l'historique de la création, stock physique −1, réservé −1). E-mail au client avec le suivi.
- [ ] « Marquer livrée » → e-mail au client ; le client voit « Livrée ».
- [ ] Refus : refuser avec motif (obligatoire) → commande annulée, stock libéré (mouvement « Libération »), e-mail au client. La pièce unique redevient achetable.

### 48 h, relance, escalade
- [ ] Sans réponse : relance e-mail au partenaire à 24 h, e-mail d'escalade aux admins à 36 h (et badge « Sans réponse » dans `/fr/admin/commandes`), annulation automatique à 48 h (stock libéré, client prévenu). Pour tester sans attendre : `npm run db:check-orders` simule ces délais ; en manuel, appeler `/api/orders/sweep` avec `Authorization: Bearer <CRON_SECRET>`.

### Admin — `/fr/admin/commandes`
- [ ] Toutes les sous-commandes avec boutique, état, suivi. « Annuler et libérer le stock » (motif obligatoire) sur une commande non expédiée → client prévenu.
- [ ] Suspension/révocation : la révocation est refusée tant que le partenaire a des commandes ouvertes.
- [ ] « Voir comme » un partenaire de démo : commandes en lecture seule.

Limites : paiement = test (aucun débit) ; retour/litige et retour de stock après livraison au lot E ; e-mails partenaires en français.

## Traduction automatique des créations

Une seule saisie (titre + description) dans la langue choisie (« Langue de saisie », défaut = langue de l'interface) ; l'autre langue est traduite à l'enregistrement.
- [ ] `/fr/fournisseur/oeuvres/nouvelle` : un seul titre / une seule description + sélecteur de langue. Enregistrer.
- [ ] Sans clé (ou quota DeepL atteint, ou erreur) : l'enregistrement réussit, aucune traduction, aucun message ; le texte d'origine s'affiche dans les deux langues, sans badge.
- [ ] Avec clé : badge « traduit automatiquement » ; corriger la version de l'autre langue puis enregistrer → badge disparu (version manuelle conservée aux enregistrements suivants).
- [ ] Modifier le titre/la description source → l'autre langue est retraduite (sauf correction manuelle simultanée).
- [ ] Une panne du service de traduction ne bloque jamais l'enregistrement.
- Variable Vercel (optionnelle) : `DEEPL_API_KEY` (DeepL API Free, endpoint api-free.deepl.com ; `DEEPL_API_URL` pour surcharger). Sans elle, pas de traduction.
- Vérif : `npm run db:check-translate`. Limite : bio du profil non traduite automatiquement.

## Fiche création d'un partenaire réel

- [ ] `/fr/produits/<slug>` d'une création publiée par un partenaire : pas de « Prix fictif de démonstration », dimensions sans mention « fictives », « Pièce unique » affiché une seule fois (pas de « Édition Pièce unique »), section « À propos de la création » absente si l'histoire est vide.
- [ ] Les pièces du catalogue de démo historique (« exemple-… ») gardent leurs mentions de démonstration.

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
