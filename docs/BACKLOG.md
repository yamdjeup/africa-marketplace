# Backlog — E póm ta’ (POC)

## Suivi du périmètre (à mettre à jour à chaque lot, dans le même commit)

Statuts : Implémenté / À implémenter ; Testé / À tester (« Testé » = validé par l'utilisateur ; en cas de doute : À tester). Détail des tests : `docs/TESTS-A-VALIDER.md`. Points juridiques/produit : `docs/POINTS-A-VALIDER.md`.

| Lot / Fonction | Implémentation | Test | Commit | Notes |
|---|---|---|---|---|
| Socle POC (US-01 à US-14, comptes US-27, suivi US-28) | Implémenté | À tester | historique git | Voir HISTORY.md |
| Pivot galerie E póm ta’ (artistes, créations, filtres) | Implémenté | À tester | historique git | GAL-01 à GAL-06 ci-dessous |
| Lot A — candidature partenaire + validation admin | Implémenté | À tester | historique git | TEST-PARTENAIRES.md |
| Lot B — créations et stock | Implémenté | À tester | historique git | |
| Lot C — commandes par partenaire (48 h, relance, escalade) | Implémenté | À tester | historique git | |
| Lot D — paiements (registre en mode test, versements) | Implémenté | À tester | historique git | Aucun argent réel |
| Traduction automatique des créations (DeepL) | Implémenté | À tester | historique git | Nécessite DEEPL_API_KEY |
| Lots F2 à F34 (corrections, tableaux admin/partenaire, avatars, audit) | Implémenté | À tester | 4f125ef, c678751, f6cecf5… | Recette manuelle partielle par l'utilisateur |
| Lot 3 / 3 bis / 3 ter / 3 quater | Implémenté | À tester | c144153, d2aa19f, 8d6983f, 5fef63c | Merge 0bd23eb |
| E-mails clients style Farfetch (reçue, en route, livrée) + vignettes, adresse, taille | Implémenté | À tester | 64c2405, f47b896, 0989687, 99973ae, 25b2158 | Aperçus HTML régénérables |
| Retrait des mentions démo/fictif/simulé/provisoire | Implémenté | À tester | be40799, 5d96dd3 | |
| Pages d'aide (FAQ, CGV, contact, confidentialité, commandes, paiement, retours, cookies) | Implémenté | À tester | 6f7466d, 946b1a7, b7117fe, cd9ee14 | À valider par un juriste |
| GA4 + bandeau de consentement (Consent Mode v2) | Implémenté | À tester | 395fb4b, c8ced75 | NEXT_PUBLIC_GA_ID à configurer |
| Livraison multi-partenaires en colis séparés | Implémenté | À tester | 08f6b9a | Pas de frais par colis |
| Annulation par colis depuis le compte | Implémenté | À tester | 003a511 | |
| Retrait « Offerte » + docs/POINTS-A-VALIDER.md | Implémenté | À tester | 6dd4987 | |
| Suivi de livraison (transporteur + lien de suivi) | Implémenté | À tester | 41abaa4 | Saisie admin non faite |
| Remboursement Stripe à l'annulation, au refus et à l'expiration | Implémenté | À tester | voir git log | Rattrapage si colis fermé avant confirmation du paiement ; échecs journalisés (refundNote) ; mention du montant remboursé dans mails et suivi |
| Branchement du paiement Stripe au checkout (Checkout hébergé + webhook) | Implémenté | À tester | voir git log | Sans clé = comportement actuel ; stock réservé tant que non payé ; webhook exempté du mur d'accès privé ; photos /api/media exemptées (images des e-mails) |
| Lot E — retours / remboursements / litiges | À implémenter | À tester | — | |
| Lot F — livraison / étiquettes / douane | À implémenter | À tester | — | |
| Lot G — messagerie / notifications | À implémenter | À tester | — | |
| Lot H — finance / KYC / Stripe Connect | À implémenter | À tester | — | |
| Lot I — stats / avis / sous-comptes | À implémenter | À tester | — | |
| Lot J — certificat PDF + QR + /verifier | À implémenter | À tester | — | |
| Lot 4 — modération + Vitest | À implémenter | À tester | — | |
| Nettoyage prod : domaine, contacts provisoires, Playwright, NEXT_PUBLIC_SITE_URL, GA_ID, DeepL, TVA/DSA/DAC7 | À implémenter | À tester | — | Voir DEPLOIEMENT.md |
| Décision : option livraison offerte | À décider | — | — | « On verra plus tard » |
| Décision : frais de port fixe / calculé | À décider | — | — | « On verra plus tard » |
| Saisie du transporteur côté admin | À implémenter | À tester | — | Optionnel |

Ordre = priorité d'exécution. Statut initial : À faire. Chaque story est autonome et livrable ; « DoD » commun : lint + typecheck + build OK, aucun secret commité.

> **Mise à jour du périmètre (2026-11-01)** : le POC inclut aussi les comptes utilisateurs (inscription, connexion, profil — US-27) et le suivi de commande (page Mes commandes, statuts simulés — US-28). Sont exclus : vrai paiement Stripe (US-14 devient un checkout simulé sans Stripe), back-office vendeur (US-15 à US-17 abandonnées), avis et liste de souhaits. Partie 1 développée : US-06 (hors table Variant), US-07 (seed), US-08, US-09 à US-14 (version simulée) ; comptes et suivi = partie 2 (faite, voir HISTORY).

> **Pivot galerie (2026-11)** : le POC devient « E póm ta’ », galerie d'artistes plasticiens afrodescendants en démonstration privée (voir HISTORY). Fait : 5 artistes, 12 œuvres, bios G3A, pièce unique, filtres artiste/catégorie/prix/recherche. À faire (BACKLOG galerie) : **GAL-01** protéger le déploiement Vercel par mot de passe avant tout partage (images non publiques) ; **GAL-02** valider titres/dimensions/années des œuvres (dont « Kwame ») ; **GAL-03** compléter pays/ville des artistes si fournis ; **GAL-04** page « À propos » dédiée (sens de E póm ta’, G3A) ; **GAL-05** vrais prix et conditions de vente si le projet dépasse la démo ; **GAL-06** manifest PWA aux nouveaux nom/identité (aucun n'existe aujourd'hui).

**US-27 Comptes utilisateurs** — Je veux m'inscrire, me connecter et gérer mon profil. (Partie 2, fait : Auth.js credentials, e-mail + mot de passe hashé bcrypt, profil modifiable ; checkout invité ou lié au compte)

**US-28 Suivi de commande** — Je veux voir mes commandes et leur statut simulé dans « Mes commandes ». (Partie 2, fait : `/[locale]/account/orders` et détail ; statuts confirmée → en préparation (2 min) → expédiée (10 min) → livrée (60 min), calculés selon l'ancienneté)

## Phase 0 — Fondations

**US-01 Initialiser le projet** — En tant qu'équipe, je veux un squelette Next.js TS prêt à développer.
- Next.js (App Router) + TypeScript + ESLint + Prettier ; `npm run dev/build/lint` fonctionnent
- `.gitignore` exclut `.env*` ; `.env.example` fourni sans valeurs secrètes
- README décrit installation et scripts

**US-02 CI GitHub Actions** — Je veux une intégration continue.
- Workflow lint + typecheck + build sur chaque push/PR
- Échec bloquant si une étape échoue

## Phase 1 — Design (Tailwind + shadcn)

**US-03 Design system** — Je veux une identité premium cohérente.
- Tailwind + shadcn/ui installés ; tokens (couleurs, typographie, espacements) documentés
- Composants de base : Button, Card, Input, Select, Badge, Sheet, Dialog
- Contraste AA respecté

**US-04 Layout global** — Je veux header, footer, navigation responsive.
- Header : logo, navigation, recherche, panier (compteur), sélecteur FR/EN
- Menu mobile fonctionnel ; footer avec liens

**US-05 Maquettes des pages clés** — Je veux des écrans validés avant développement.
- Accueil, catalogue, produit, créateur, panier, checkout, back-office rendus en composants avec données statiques
- Vues mobile et desktop

## Phase 2 — Données fictives FR/EN

**US-06 Modèle de données** — Je veux un schéma Prisma.
- Entités : Creator, Product, Variant, Category, Order, OrderItem
- Champs textuels bilingues (FR/EN) ; prix en centimes EUR
- Migration appliquée sur Neon (ou PostgreSQL local)

**US-07 Jeu de données seed** — Je veux ~30 produits et ~8 créateurs fictifs.
- `npm run db:seed` idempotent
- Produits répartis : couture, bijoux, art, déco ; ≥ 8 pays africains
- Descriptions FR/EN ; images libres de droits avec sources listées dans `docs/IMAGES.md`
- Aucune donnée réelle ni personnelle

**US-08 Internationalisation** — Je veux basculer FR/EN.
- Routes localisées (`/fr`, `/en`) ; langue par défaut FR
- Tous les libellés UI et contenus seed traduits

## Phase 3 — Développement

**US-09 Accueil** — Je veux découvrir la marque.
- Hero, sélection de produits, créateurs à la une, lien vers catalogue
- Données issues de la base

**US-10 Catalogue** — Je veux parcourir et filtrer.
- Liste paginée ; filtres catégorie/pays/prix ; tri prix et nouveautés ; recherche texte
- État vide géré ; filtres reflétés dans l'URL

**US-11 Fiche produit** — Je veux voir le détail et acheter.
- Galerie, description, prix, choix de variante/taille, lien créateur
- « Ajouter au panier » désactivé si variante non choisie

**US-12 Fiche créateur** — Je veux connaître l'artisan.
- Bio, pays, photo, liste de ses produits
- 404 propre si créateur inconnu

**US-13 Panier** — Je veux gérer mes articles.
- Ajout, suppression, modification de quantité, total recalculé
- Persistance après rechargement (localStorage)

**US-14 Checkout simulé Stripe test** — Je veux payer sans risque.
- Formulaire adresse + Stripe Checkout en mode test (carte 4242…)
- Commande créée en base à la réussite ; page de confirmation ; échec géré
- Bandeau « Mode démo, aucun paiement réel » ; clés via variables d'environnement uniquement

**US-15 Back-office : accès vendeur** — Je veux me connecter.
- Authentification simple (comptes vendeurs fictifs) ; routes `/admin` protégées
- Un vendeur ne voit que ses données

**US-16 Back-office : produits** — Je veux gérer mon catalogue.
- Liste, création, édition, suppression/archivage ; validation des champs FR/EN, prix, stock
- Modification visible sur le site

**US-17 Back-office : commandes** — Je veux suivre mes ventes.
- Liste des commandes contenant mes produits ; détail ; changement de statut (payée, expédiée)

**US-18 PWA** — Je veux installer l'application.
- Manifest, icônes (fait, lot PWA 2026-11 : installable, derrière le mur) ; **service worker : reporté**
- Pages visitées consultables hors-ligne (fallback offline) : **reporté, pas de service worker ni de mode hors ligne dans ce lot**

**US-19 SEO et performance** — Je veux un site rapide et indexable.
- Métadonnées et Open Graph par page ; `next/image` ; sitemap
- Lighthouse mobile ≥ 85 perf, ≥ 90 accessibilité

**US-28 E-mail de confirmation de commande** — Je veux recevoir un e-mail après ma commande simulée.
- Fait : nodemailer + SMTP Gmail, FR/EN, tolérant aux pannes (voir HISTORY). À faire plus tard : domaine dédié et fournisseur transactionnel (Resend…), e-mail d'expédition.

## Phase 4 — Tests Playwright

**US-20 Configuration Playwright** — Je veux des tests E2E reproductibles.
- Playwright installé ; base seed dédiée ; exécution locale et en CI

**US-21 Parcours acheteur E2E** — Je veux valider le parcours critique.
- Accueil → catalogue (filtre) → produit → panier → checkout test → confirmation
- Vérifie la commande en base

**US-22 Parcours vendeur E2E** — Je veux valider le back-office.
- Connexion → création produit → visible en catalogue → commande visible
- Accès refusé sans authentification

**US-23 Tests PWA et i18n** — Je veux couvrir les transverses.
- Bascule FR/EN ; manifest présent ; viewport mobile sur parcours principal

## Phase 5 — Déploiement

**US-24 Base Neon** — Je veux une base hébergée gratuite.
- Projet Neon créé ; `DATABASE_URL` uniquement dans Vercel/secrets locaux ; migrations + seed exécutés

**US-25 Déploiement Vercel** — Je veux le site en ligne.
- Dépôt GitHub personnel relié à Vercel ; variables (DB, Stripe test, auth) configurées côté Vercel
- Previews par branche ; URL de production fonctionnelle

**US-26 Recette finale** — Je veux valider le POC.
- Tests Playwright exécutés sur l'URL déployée ; rapport joint
- README final (démo, comptes fictifs, limites connues) ; vérification : aucun secret dans l'historique, aucune mention d'ENGIE

## État des lots de maquette (2026-11-03)

Livrés : A, B, correctifs filtres, C, D, D2, D3, E, E2, E3, E4, E5, E6, E7, E8, F1 (détail dans HISTORY). Connexion Google validée en ligne le 2026-11-03.

Reste à faire :
- Tests sur téléphone réel : AR / « Voir dans votre intérieur » et Miroir (caméra).
- Vraies pièces et vrais créateurs à la place des exemples ; pays/orthographe confirmés pour House of Marjón ; vraies dimensions et vrais prix.
- Droits des visuels (voir ci-dessous) : accord ou retrait avant toute mise en ligne publique.
- Sauvegardes Neon, nom de domaine, e-mail transactionnel dédié (Resend…), service worker/hors-ligne (US-18).
- **Reportés** : connexion Facebook (app Meta à créer) et Apple (compte Apple Developer payant) ; boutons retirés des pages connexion/inscription, seul Google est proposé.
- Adresses : saisie guidée via Photon (gratuit, sans SLA, OSM) ; à remplacer par Google Places / Loqate / La Poste avant un lancement public. Le contrôle code postal/ville est indicatif (non bloquant).

## Page À propos (lot F17)

- Texte ghomálá' (« E póm ta’ » = « Tu es très belle ») à faire valider par un locuteur (graphie et signes diacritiques) avant toute mise en ligne publique.

## Droits des visuels d'exemple (Miroir)

- Les images `public/images/examples/` de couture (`veste-tiedye.webp`, `ceinture-cuir.webp`, `haut-toile-cuir.webp`, `veste-verte-portee.webp`) restent la **propriété des marques/créateurs** (Imane Ayissi, LDM, Lozama Leombho). Usage : **démo privée uniquement**.
- **Retirer ou obtenir l'accord des ayants droit avant toute mise en ligne publique** (retrait : `npm run db:examples-remove` / `prisma/seed.examples.remove.neon.sql`, puis supprimer les fichiers).
- Attribution : tie-dye → Imane Ayissi ; Hao Set → LDM (Look Different Marque) ; Akara Belt et Neitha Harness → Lozama Leombho. Ces créateurs ont une page et figurent dans « Nos artistes » (lot E4). Prix, tailles et stock restent fictifs ; titres « (Exemple) » + badge.
- La catégorie « Bijoux » a été renommée « Accessoires » / « Accessories » (libellé seulement ; le slug technique `bijoux` est conservé). Le code Miroir bijoux est conservé pour de vraies pièces.
- House of Marjón (maison d'accessoires nigériane) : `marjon-lunettes-cristaux.webp` et `marjon-lunettes-cauris.webp` sont la **propriété de House of Marjón** ; photos tirées d'Instagram (@onemarjon), recadrées 4:5, **démo privée uniquement**. Bio d'après une source indirecte (aperçu IA), formulée prudemment : à confirmer avec la maison, ainsi que l'attribution des pièces à des collections (non confirmée). Obtenir l'accord avant toute mise en ligne publique (le retrait passe par le seed examples remove).
