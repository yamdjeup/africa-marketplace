# Instructions Copilot — Marketplace d'art et de couture africaine

POC « E póm ta’ » (anciennement Afrique Marketplace) : galerie en ligne d'artistes plasticiens afrodescendants, démonstration privée. Voir `docs/PRD.md`, `docs/BACKLOG.md`, `docs/HISTORY.md`.

## Stack
- Next.js (App Router) + TypeScript strict
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL (Neon)
- Déploiement Vercel
- Paiement : Stripe, **mode test uniquement**

## Périmètre figé (POC, 2 semaines max)
Accueil, catalogue (~30 produits fictifs), fiches produit et créateur, panier, checkout simulé (Stripe test), mini back-office vendeur. Tout le reste est hors périmètre.

## Conventions
- Code et identifiants en anglais ; contenu UI en français (anglais en second).
- Composants serveur par défaut ; `"use client"` seulement si nécessaire.
- Accès DB uniquement via Prisma ; migrations versionnées dans `prisma/`.
- Données fictives uniquement (pas de vraies personnes ni vraies marques).
- Variables d'environnement documentées dans `.env.example` (sans valeurs réelles).
- Commits courts et atomiques ; décisions importantes consignées dans `docs/HISTORY.md`.
- Accessibilité et responsive mobile-first.

## Interdits
- Rien de lié à ENGIE (noms, données, outils, comptes, identifiants).
- Aucun secret commité ; `.env*` ignoré par git (sauf `.env.example`).
- Ne pas utiliser le compte GitHub géré par ENGIE ; dépôt sur le compte personnel.
- Pas de `git push` ni de PR sans accord explicite de l'utilisateur.
- Pas de clés Stripe live.

## Agents et skills
Rôles dans `.github/agents/` (produit, design, données, dev, qa, déploiement). Procédures réutilisables dans `.github/skills/`.
