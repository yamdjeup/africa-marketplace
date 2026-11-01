---
name: deploiement-vercel-neon
description: Déployer l'app Next.js sur Vercel avec une base Neon PostgreSQL (offres gratuites) et Stripe en mode test.
---

# Déploiement Vercel + Neon

Prérequis : comptes personnels Vercel et Neon (jamais un compte professionnel/ENGIE). Accord explicite de l'utilisateur avant tout push ou déploiement.

1. **Neon** : créer un projet, récupérer la chaîne de connexion (pooled) → `DATABASE_URL` ; éventuellement `DIRECT_URL` pour les migrations.
2. **Vercel** : importer le dépôt GitHub personnel, framework Next.js.
3. **Variables d'environnement** (Vercel > Settings) : `DATABASE_URL`, `DIRECT_URL`, `STRIPE_SECRET_KEY` (sk_test_…), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test_…), `STRIPE_WEBHOOK_SECRET` si utilisé. Jamais dans le dépôt ; maintenir `.env.example` sans valeurs.
4. **Build** : `prisma generate` avant `next build` (script `postinstall` ou build) ; appliquer les migrations avec `prisma migrate deploy`.
5. **Seed** : `prisma db seed` (voir skill `donnees-fictives`).
6. **Vérifier** : parcours accueil → catalogue → panier → checkout (carte test 4242 4242 4242 4242) → back-office.
7. Consigner le déploiement dans `docs/HISTORY.md`.
