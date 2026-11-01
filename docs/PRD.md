# PRD — E póm ta’ (POC)

## 1. Vision
Marketplace premium d'art et de couture africaine, « Farfetch de l'Afrique » : mettre en relation des créateurs et artisans du continent avec une clientèle internationale exigeante, avec une expérience haut de gamme (éditorial, storytelling créateur, authenticité).

## 2. Objectif du POC
Démontrer de bout en bout, avec des données fictives, le parcours d'achat et la gestion vendeur. POC réalisé exclusivement par des agents IA ; aucun paiement réel, aucune donnée personnelle réelle.

## 3. Personas
- **Acheteuse/acheteur** : cherche des pièces uniques (mode, art, déco), sensible à l'origine et à l'histoire du créateur.
- **Créateur/vendeur** : gère son catalogue et ses commandes via un mini back-office.

## 4. Périmètre (inclus)
Site Next.js (TypeScript) installable en PWA, bilingue FR/EN :
1. Accueil (hero, sélections, créateurs à la une)
2. Catalogue (~30 produits fictifs, filtres catégorie/pays/prix, tri, recherche simple)
3. Fiche produit (galerie, description, taille/variante, ajout au panier)
4. Fiche créateur (bio, pays, produits)
5. Panier (quantités, total)
6. Checkout simulé (Stripe **mode test**, confirmation de commande)
7. Mini back-office vendeur (connexion simple, CRUD produits, liste des commandes)

## 5. Hors périmètre
Paiements réels, reversements vendeurs, livraison/douane réelle, avis, messagerie, multi-devise dynamique, modération, application native.

## 6. Exigences non fonctionnelles
- Responsive mobile-first, PWA (manifest, service worker, hors-ligne basique)
- Performance : Lighthouse ≥ 85 (mobile) ; accessibilité ≥ 90
- i18n FR/EN ; prix affichés en EUR (devise unique)
- Sécurité : aucun secret commité, `.env*` ignoré, clés Stripe test uniquement via variables d'environnement
- Indépendance : dépôt GitHub personnel, aucun lien avec ENGIE

## 7. Stack et hébergement
Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui, Prisma + PostgreSQL (Neon, offre gratuite), Stripe (test), Playwright (E2E), déploiement Vercel (offre gratuite), CI GitHub Actions.

## 8. Étapes du projet
Cadrage (ce document) → Design (Tailwind + shadcn) → Données fictives FR/EN → Développement → Tests Playwright → Déploiement.

## 9. Critères de succès du POC
- Un visiteur parcourt accueil → catalogue → produit → panier → paiement test → confirmation sans erreur
- Un vendeur crée/modifie un produit et voit la commande
- Tests E2E Playwright verts en CI ; application en ligne sur Vercel
- Coût d'infrastructure : 0 €

## 10. Risques
| Risque | Mitigation |
|---|---|
| Limites des offres gratuites (Neon, Vercel) | Données légères, images optimisées/hébergées localement |
| Images fictives sous droits | Images libres de droits ou générées, sources documentées |
| Dérive de périmètre | Backlog ordonné, hors-périmètre explicite |
