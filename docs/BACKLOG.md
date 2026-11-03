# Backlog — E póm ta’ (POC)

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

## Droits des visuels d'exemple (Miroir)

- Les images `public/images/examples/` de couture (`veste-tiedye.webp`, `ceinture-cuir.png`, `haut-toile-cuir.png`, `veste-verte-portee.webp`) proviennent de sources tierces **protégées** (la veste tie-dye porte une signature de créateur visible). Usage : **démo privée uniquement**.
- **Retirer ou obtenir l'accord des ayants droit avant toute mise en ligne publique** (retrait : `npm run db:examples-remove` / `prisma/seed.examples.remove.neon.sql`, puis supprimer les fichiers).
- Aucune de ces pièces n'est attribuée à un créateur ou une marque réels : créateur affiché « Exemple », prix et tailles fictifs.
