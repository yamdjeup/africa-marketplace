# Journal des décisions

Format : date — décision — raison. Ajouter les entrées en bas.

## 2026-11-01
- **Délai** : POC livré en 2 semaines maximum.
- **Périmètre figé** : accueil, catalogue (~30 produits fictifs), fiches produit et créateur, panier, checkout simulé Stripe (mode test), mini back-office vendeur.
- **Dépôt** : sur le compte GitHub personnel. Le compte `patrickyamdjeu` est un compte géré par ENGIE et ne doit pas être utilisé ; le projet doit rester migrable (savoir dans le dépôt, format standard Copilot : `.github/`).
- **Hébergement** : cloud gratuit, Vercel + Neon PostgreSQL.
- **Cadrage** : PRD (`docs/PRD.md`) et backlog (`docs/BACKLOG.md`) faits.
- **Design et socle front** faits (branche `sf6521-engieco-design-et-socle-front`).
- **Mémoire du projet** : `.github/copilot-instructions.md`, agents (`.github/agents/`) et skills (`.github/skills/`) créés.

## 2026-11-01 (suite) — Périmètre élargi et développement partie 1
- **Périmètre du POC (livraison lundi 9 novembre 2026)** : inclut aussi les **comptes utilisateurs** (inscription, connexion, profil) et le **suivi de commande** (page « Mes commandes », statuts simulés). **Exclus** : vrai paiement Stripe, back-office vendeur, avis, liste de souhaits. Cette décision remplace le périmètre figé ci-dessus (Stripe test et back-office retirés).
- **Partie 1 (catalogue et panier)** : routes localisées `/fr` `/en`, accueil, catalogue (filtres catégorie/pays/prix, tri, recherche, pagination, filtres dans l'URL), fiche produit, fiche créateur, panier (localStorage), checkout simulé (commande enregistrée en base, aucun paiement), confirmation. Comptes et suivi de commande = partie 2.
- **Données** : Prisma ; schéma PostgreSQL (Neon) canonique dans `prisma/schema.prisma`, migration `0001_init`. `DATABASE_URL` vient de `.env.local` (ignoré par git) ; sans elle, `scripts/db.mjs` dérive un schéma SQLite local (`prisma/.dev/`, ignoré) — même couche Prisma. Prisma 6 (le provider est fixe par schéma). Pas de table Variant : les tailles sont un champ JSON du produit.
- **Technique** : `cacheComponents`/`partialPrefetching` retirés de `next.config.ts` (pages DB rendues à la demande) ; `proxy.ts` redirige les URLs sans langue vers `/fr` ; la page `/design` ne garde que couleurs, typographie et boutons.


## 2026-11-01 (suite) — Partie 2 : comptes et commandes
- **Auth** : Auth.js v5 (next-auth beta), provider Credentials (e-mail + mot de passe hashé bcryptjs), sessions JWT sans table Session. Secret via `AUTH_SECRET` (`.env.local` ignoré ; `.env.example` sans valeur ; valeur de repli non sécurisée hors production uniquement). Pages `/[locale]/login`, `register`, `account` (profil, changement de mot de passe) ; `/api` exclu du matcher de `proxy.ts`.
- **Commandes** : `Order.userId` optionnel (migration `0002_accounts`, compatible Postgres/Neon et SQLite) ; le checkout reste possible en invité (commande sans compte, non listée dans « Mes commandes ») et lie la commande à l'utilisateur connecté (e-mail/nom préremplis).
- **Suivi** : statuts simulés non stockés, calculés à l'affichage selon l'ancienneté (`src/lib/order-status.ts` : confirmée, en préparation dès 2 min, expédiée dès 10 min, livrée dès 60 min). Pages `/[locale]/account/orders` et `/[locale]/account/orders/[number]` (accès limité au propriétaire).
- **Test** : lint et build OK ; routes testées sur serveur de production (redirections si non connecté, connexion valide/invalide, liste et détail FR/EN, 404 commande d'autrui).

## 2026-11-01 (suite) — QA end-to-end (Playwright)
- **Tests** : `npm run test:e2e` (Playwright, Chromium ; `e2e/journey.spec.ts` desktop, `e2e/mobile.spec.ts` Pixel 7). Le serveur de test est lancé automatiquement (`npm run build` puis `next start -p 3100`) sur la base SQLite locale (`npm run db:setup` requis une fois) avec un `AUTH_SECRET` de test. 17 tests verts : accueil, bascule FR/EN, recherche/filtres/404, fiche, panier, inscription (validation + doublon), connexion (échec/succès, redirection), checkout connecté (commande en base, visible dans « Mes commandes » FR/EN), checkout invité EN, panier vide, absence de défilement horizontal en mobile et zone tactile du bouton de commande.
- **Bug corrigé** : après une erreur (mot de passe incorrect, e-mail déjà utilisé, champ manquant, stock…), React 19 réinitialise les formulaires pilotés par server action et efface e-mail/nom/adresse saisis. Les actions `login`, `register` et `placeOrder` renvoient désormais les valeurs saisies (hors mot de passe) réinjectées en `defaultValue`.
- **Constats sans changement de code** : `next start` en production sans `AUTH_SECRET` échoue (`MissingSecret`, comportement voulu, secret obligatoire en production) ; les tests posent donc un secret jetable. Un clic sur un choix de taille avant l'hydratation React est perdu (test rendu robuste par attente de l'hydratation ; effet marginal pour l'utilisateur).
- **Non couvert** : modification du profil, changement de mot de passe, cas de stock insuffisant, accessibilité automatisée.

## 2026-11 — Pivot : galerie en ligne d'artistes plasticiens afrodescendants (démo privée G3A)
- **Objectif** : démonstration PRIVÉE au créateur de G3A (g3a.org). Les créateurs/produits de couture fictifs sont remplacés par 5 artistes (Célanie, Cruzz Taylor, Morère, KeNoF, Paula Padua Nogueira) et 12 œuvres réelles issues des photos de l'utilisateur (rattachement validé par l'utilisateur ; images dans `public/images/artworks/`, JPG =w1600 de 220–640 Ko). Biographies = textes officiels G3A tels quels (traduction EN fidèle) avec lien vers l'article source. Prix fictifs en EUR, signalés « Prix fictif de démonstration ». Catégories : Peinture, Photographie, Sculpture/Céramique, Dessin.
- **⚠ Déploiement** : les images ne doivent PAS être publiques. Le déploiement Vercel doit être protégé par mot de passe (Deployment Protection) avant tout partage de lien.
- **Modèle** : pièce unique (stock 1, quantité plafonnée à 1 au panier ; plus de tailles). Migration `0003_gallery` : retire pays/ville/prix local, ajoute `Creator.sourceUrl` et **supprime les données de démo existantes (commandes comprises)**. Le seed supprime aussi les anciennes lignes couture.
- **Noms internes conservés** : modèles `Creator`/`Product` et routes `/createurs`, `/produits`, `/catalogue` inchangés ; seuls les textes visibles deviennent « artistes » / « œuvres ». Le filtre pays devient un filtre artiste.
- **UI** : bandeau « Démonstration privée », accueil éditorial (hero œuvre, sélection, artistes), fiche œuvre grand format (image `object-contain`), crédit artiste sur chaque carte.
- **Tests** : 21 Playwright verts (desktop + mobile), lint et build OK. Les commandes épuisant une pièce unique, les parcours de commande utilisent des œuvres distinctes et le serveur de test relance `db:seed` (stock remis à 1).
- **Hypothèses à valider** : titre « Kwame » attribué à la photo celanie-3 (cartel 20, Carte d'identité, 56×76 cm, 2026) ; titres des autres œuvres descriptifs ; dimensions/années omises quand incertaines (ex. cartel de Morère « La Harpie » non repris).

## 2026-11 — Images zoom : 13 œuvres
- **Remplacement** : photos de meilleure qualité (`=w1600`, 13 images) ; anciennes images supprimées. Œuvres : Célanie ×2, Taylor ×3, KeNoF ×3, Morère ×2, Padua ×3 (13 au total).
- **« Kwame » retiré** : les deux images de Célanie ne permettent pas d'affirmer laquelle correspond au cartel 20 ; titres descriptifs sobres, sans dimensions ni année pour Célanie (technique et série conservées).
- **Tests** : slugs et décomptes mis à jour (13 œuvres, KeNoF 3, prix ≥ 5000 : 3). Le seed supprime les anciennes œuvres.

## 2026-11 — Renommage de la marque : « E póm ta’ »
- **Décision** : « Afrique Marketplace » devient « E póm ta’ » (« tu es très belle » en ghomálá’) partout : en-tête, titres/métadonnées (`siteName`), textes FR/EN, tests, docs. Caractères exacts : ó (accent aigu) et ’ (apostrophe typographique U+2019).
- **Inchangés** : nom du dépôt, nom du package npm (`afrique-marketplace`) et clé localStorage du panier. Aucun manifest PWA n'existe dans le projet (rien à renommer).
- **Signification** : sous-titre du logo (« Tu es très belle » en ghomálá’) et section « E póm ta’ » de l'accueil, FR/EN.
- **Police** : Playfair Display et Inter (sous-ensemble latin) contiennent ó et ’ ; contrôlé par test e2e sur le titre et l'en-tête.
## 2026-11 — Œuvres affichées entières
- Cartes, hero d'accueil, fiche œuvre, miniatures et panier : object-contain (plus de recadrage) avec marge de passe-partout sur fond neutre (g-muted) ; cadres de hauteur uniforme conservés pour l'alignement de la grille.

## 2026-11 — Préparation du déploiement privé (Vercel + Neon)
- **Mur de mot de passe intégré** (gratuit, sans Deployment Protection) : `src/proxy.ts` + `src/lib/site-access.ts`. Actif seulement si `SITE_ACCESS_PASSWORD` est défini (désactivé en local et dans les tests). Comparaison en temps constant (SHA-256 + XOR), cookie `site_access` httpOnly/secure/SameSite=Lax signé HMAC avec `SITE_ACCESS_SECRET` (repli sur le mot de passe), 30 jours. Page d'accès FR/EN en HTML autonome (`/acces`). Images et API derrière le mur : `images.unoptimized` (plus de `/_next/image` public) et matcher du proxy étendu ; `/_next`, favicon et `robots.txt` publics. `robots.txt` Disallow + `X-Robots-Tag: noindex` partout.
- **Neon** : schéma canonique déjà PostgreSQL. Ajout de `db:deploy` (generate + `migrate deploy`, `DIRECT_URL` prioritaire), `db:check` (validation schéma/migrations sans base) et `vercel-build` (deploy puis `next build`). `npm run build` vérifié avec une `DATABASE_URL` Postgres factice (rendu à la demande, aucun accès base au build). Seed manuel depuis le poste : `npm run db:seed` avec l'URL Neon en variable de session.
- **Docs** : `.env.example` (noms seulement), `docs/DEPLOIEMENT.md` (guide débutant), README et skill `deploiement-vercel-neon` alignés.
- **Tests** : `e2e/access.spec.ts` (projet « wall », second serveur port 3101, mot de passe jetable) ; serveur principal avec mur désactivé. 25 Playwright verts, lint et build OK.
- **Limite** : pas de limitation de tentatives sur le mot de passe. **Non vérifié** : migration/seed contre un vrai Neon (pas de base disponible ici).

## 2026-11 — Photos dignes d'une galerie
- Script reproductible `scripts/enhance-photos.py` (OpenCV/Pillow) : redressement de perspective, recadrage au plus près, niveaux de luminance, netteté douce ; JPEG q90, 2000 px max. Aucune retouche créative ; balance des blancs seulement sur les céramiques (mur blanc), jamais sur les teintes d'auteur.
- Originaux dans `scripts/photo-originals/` (gitignoré, hors déploiement).
- Limites : Célanie 1 (vitrine, reflets sombres à droite) et Morère 1 (mur conservé, sculptures sans cadre) ne peuvent être nettoyés automatiquement.

### Photos — v2 (centrage et marges symétriques)
- Chaque bord est détecté par script (gradient + droite robuste sur 13 points, deux passes), redressement par les 4 coins ajustés, marge de sécurité de 3 px au-delà du bord (jamais de coupe de l'œuvre). Sculptures (Morère) : centrage sur le bbox de l'objet + marge uniforme 7 %.
- Marges mesurées après recadrage (px, Gauche/Droite/Haut/Bas ; pour les œuvres planes = liseré résiduel autour des 3 px de sécurité, 0 = aucun bord détecté ; pour les sculptures = marge réelle autour de l'objet) :

| Œuvre | Taille avant plafonnement | G/D/H/B |
|---|---|---|
| celanie-1 | 1437x2030 | 3/3/3/3 |
| celanie-2 | 1173x1687 | 3/2/3/2 |
| kenof-1 | 1565x1255 | 3/3/3/0 |
| kenof-2 | 1562x1199 | 3/2/5/0 |
| kenof-3 | 1561x1283 | 3/2/2/2 |
| morere-1 | 1571x782 | 96/96/96/96 |
| morere-2 | 1122x2698 | 165/165/165/165 |
| padua-1 | 1555x2261 | 3/2/0/0 |
| padua-2 | 1556x1131 | 3/2/2/0 |
| padua-3 | 1555x2350 | 3/2/3/0 |
| taylor-1 | 1480x2295 | 3/3/3/3 |
| taylor-2 | 1565x1060 | 3/2/3/0 |
| taylor-3 | 1443x2202 | 3/3/3/3 |
- Limites : Célanie 1 garde des reflets de vitrine ; le bord noir sur noir reste approximatif.

## 2026-11 — Seed SQL pour Neon
- `npm run db:seed-sql` (scripts/seed-sql.ts, lit src/data comme seed.ts) génère `prisma/seed.neon.sql` : upserts idempotents + nettoyage des anciennes lignes, en transaction. Vérifié sur PGlite (migrations 0001-0003 puis SQL exécuté 2 fois) : 4 catégories, 5 artistes, 13 œuvres, stock total 13. Permet de charger Neon via son SQL Editor quand le port 5432 est bloqué (DEPLOIEMENT.md, étape 5 bis). Régénérer le fichier à chaque changement de données.

## 2026-11 — PWA installable
- `src/app/manifest.ts` (nom « E póm ta’ », standalone, start_url /fr, lang fr, couleurs #1c3060 / #faf6ee dérivées de la charte), icônes 192/512, maskable 512 et apple-touch-icon (monogramme « E » doré sur indigo) dans `public/icons/`, themeColor et appleWebApp dans le layout.
- `src/proxy.ts` : seuls `/manifest.webmanifest` et `/icons/*.png` passent le mur sans cookie (les navigateurs récupèrent le manifeste sans identifiants) ; images et API restent bloquées (test `access.spec.ts`).
- Pas de service worker ni de hors-ligne (BACKLOG US-18).
