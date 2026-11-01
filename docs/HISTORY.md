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
