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