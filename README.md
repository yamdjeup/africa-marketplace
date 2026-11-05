# E póm ta’ (POC)

Galerie en ligne d'artistes plasticiens afrodescendants (démonstration privée) — données fictives, aucun paiement réel. Voir `docs/`.

## Démarrage

```bash
npm install
cp .env.example .env.local   # optionnel : renseigner DATABASE_URL (PostgreSQL / Neon)
npm run db:setup             # génère le client Prisma, applique le schéma, charge le seed
npm run dev                  # http://localhost:3000 (redirige vers /fr)
```

Sans `DATABASE_URL`, une base SQLite locale (`prisma/.dev/dev.db`, ignorée par git) est utilisée via la même couche Prisma. Avec une URL PostgreSQL, `db:setup` applique les migrations de `prisma/migrations/` puis le seed (idempotent). Ne jamais commiter `.env.local`.

## Scripts

`dev`, `build`, `start`, `lint`, `test:e2e`, `db:setup`, `db:push`, `db:seed`, `db:deploy` (migrations PostgreSQL), `db:check`, `db:studio`, `vercel-build`.

Déploiement privé Vercel + Neon avec mot de passe d'entrée (`SITE_ACCESS_PASSWORD`) : voir `docs/DEPLOIEMENT.md`. Architecture complète (GitHub, Vercel, Neon, services, variables d'environnement) : voir `docs/ARCHITECTURE.md`.
