---
name: donnees-fictives
description: Générer des données fictives bilingues FR/EN (produits d'art et de couture africaine, créateurs) pour le seed Prisma.
---

# Données fictives FR/EN

Objectif : ~30 produits, ~6–8 créateurs, catégories (couture, bijoux, sculpture, peinture, textile, décoration).

Règles :
- 100 % fictif : pas de vraies personnes, marques ni œuvres protégées.
- Chaque produit : `slug`, `name` / `nameEn`, `description` / `descriptionEn`, prix en EUR (centimes), catégorie, matériaux, origine (pays/ville), stock, 2–4 images (placeholders ou libres de droits), créateur.
- Chaque créateur : `slug`, nom d'atelier, pays, bio FR/EN courte, image.
- Ton premium, éditorial, respectueux des savoir-faire (wax, bogolan, kente, bronze, perles…).
- Seed idempotent (`upsert` par `slug`) dans `prisma/seed.ts`, exécuté via `prisma db seed`.
- Données stables (pas d'aléatoire non seedé) pour des tests reproductibles.
