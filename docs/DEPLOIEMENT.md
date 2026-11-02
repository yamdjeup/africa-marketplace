# Guide de déploiement — E póm ta’ (démonstration privée)

Ce guide explique, pas à pas, comment mettre le site en ligne **gratuitement** avec Vercel (hébergement) et Neon (base de données), protégé par un **mot de passe d'entrée**. Aucune connaissance technique n'est nécessaire.

> **Règle d'or** : ne collez jamais un mot de passe, une clé ou une adresse de base de données dans un fichier du projet, dans GitHub ou dans un message. Ils se saisissent uniquement dans les écrans de Vercel et de Neon (étape 3).

Les œuvres sont protégées : tant que le visiteur n'a pas saisi le mot de passe, il ne voit ni les pages, ni les images.

---

## Ce qu'il vous faut

- Un compte **GitHub** personnel qui contient le dépôt `afrique-marketplace`.
- Un compte **Vercel** personnel (gratuit) : <https://vercel.com>.
- Un compte **Neon** personnel (gratuit) : <https://neon.tech>.
- Utilisez des comptes **personnels**, jamais un compte professionnel.

## Étape 1 — Créer la base de données sur Neon

1. Connectez-vous à Neon, cliquez sur **New project**, donnez un nom (ex. `epomta`), choisissez la région la plus proche (ex. Frankfurt), puis **Create**.
2. Sur la page du projet, cliquez sur **Connect**. Vous voyez une adresse qui commence par `postgresql://…`.
3. Laissez l'option **Connection pooling** activée et **copiez** cette adresse (c'est votre `DATABASE_URL`). Gardez la page ouverte : vous en aurez besoin plus loin.
4. Désactivez le pooling et copiez la seconde adresse (la « directe », c'est votre `DIRECT_URL`). Elle sert uniquement pour la migration ; elle est facultative mais évite certaines erreurs.

## Étape 2 — Importer le projet dans Vercel

1. Sur Vercel : **Add New… → Project**, puis **Import** le dépôt `afrique-marketplace` (autorisez l'accès GitHub si demandé).
2. Vercel détecte automatiquement **Next.js**. Ne changez rien aux commandes : le projet contient déjà la bonne commande de construction (`vercel-build`) qui prépare la base à chaque déploiement.
3. **Ne cliquez pas encore sur Deploy** : ouvrez d'abord la section **Environment Variables** (étape 3).

## Étape 3 — Renseigner les variables d'environnement

Dans **Environment Variables**, ajoutez les lignes suivantes (nom à gauche, valeur à droite). La liste des noms est aussi dans `.env.example`, sans valeurs.

| Nom | Quoi mettre |
| --- | --- |
| `DATABASE_URL` | L'adresse Neon avec pooling (étape 1.3). |
| `DIRECT_URL` | L'adresse Neon directe (étape 1.4). Facultatif. |
| `AUTH_SECRET` | Une longue suite de caractères aléatoires (voir ci-dessous). Sert aux comptes clients. |
| `SITE_ACCESS_PASSWORD` | Le mot de passe d'entrée que vous communiquerez à vos invités. Choisissez-en un long (une phrase). |
| `SITE_ACCESS_SECRET` | Une autre longue suite aléatoire, différente d'`AUTH_SECRET`. Sert à signer le cookie d'accès. |
| `AUTH_URL` | L'adresse du site, ex. `https://epomta.vercel.app` (à compléter après le premier déploiement, voir étape 6). |

**Fabriquer une suite aléatoire** : sur Windows, ouvrez PowerShell et lancez
`[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`
puis copiez le résultat dans Vercel (ne l'enregistrez dans aucun fichier du projet). Faites-le deux fois : une pour `AUTH_SECRET`, une pour `SITE_ACCESS_SECRET`.

Cochez les environnements **Production** (et **Preview** si vous voulez que les liens de test soient aussi protégés).

## Étape 4 — Déployer

Cliquez sur **Deploy**. Vercel installe le projet, **applique les migrations sur Neon** (création des tables), puis construit le site. Comptez 2 à 4 minutes. S'il échoue, ouvrez le journal (**Build Logs**) : une erreur sur `DATABASE_URL` signifie presque toujours une adresse mal copiée.

## Étape 5 — Charger les œuvres dans la base (seed)

La base est vide après la migration. Chargez les artistes et les œuvres **une seule fois**, depuis votre ordinateur :

1. Ouvrez PowerShell dans le dossier du projet (Node.js doit être installé, puis `npm install`).
2. Collez l'adresse Neon **dans la session PowerShell uniquement** (elle disparaît à la fermeture de la fenêtre) :

   ```powershell
   $env:DATABASE_URL = "COLLEZ_ICI_L_ADRESSE_NEON"
   npm run db:deploy   # facultatif : crée/valide les tables (déjà fait par Vercel)
   npm run db:seed     # charge catégories, artistes et œuvres
   Remove-Item Env:DATABASE_URL
   ```

3. Vous devez voir `Seed OK : 4 catégories, 5 artistes, 13 œuvres`. Le seed peut être relancé sans danger (il remet notamment le stock des pièces uniques à 1).

## Étape 6 — Tester

1. Dans Vercel, cliquez sur **Visit** (ou ouvrez l'adresse du projet). Vous devez voir la page **Accès réservé** et non le site.
2. Saisissez un mauvais mot de passe : message d'erreur. Saisissez le bon : le site s'ouvre sur la galerie.
3. Ajoutez une œuvre au panier, passez la commande simulée (aucun paiement réel), créez un compte, regardez « Mes commandes ».
4. Ouvrez l'adresse dans une fenêtre de navigation privée : le mur doit réapparaître.
5. Si ce n'est pas déjà fait, renseignez `AUTH_URL` avec l'adresse définitive (Vercel > **Settings → Environment Variables**), puis **Deployments → ⋯ → Redeploy**.

## Changer le mot de passe d'entrée

1. Vercel > votre projet > **Settings → Environment Variables**.
2. Modifiez la valeur de `SITE_ACCESS_PASSWORD` (**Edit**, puis **Save**).
3. **Deployments** → le dernier déploiement → **⋯ → Redeploy**. 
4. L'ancien mot de passe ne fonctionne plus. Pour déconnecter immédiatement tous les visiteurs déjà entrés, changez aussi `SITE_ACCESS_SECRET` avant de redéployer.

Pour **fermer complètement** la démo : mettez un mot de passe que personne ne connaît, ou mettez le projet en pause (**Settings → General**).

## En cas de problème

| Symptôme | Piste |
| --- | --- |
| Le build échoue sur la base | Vérifiez `DATABASE_URL` (commence par `postgresql://`) ; ajoutez `DIRECT_URL`. |
| « MissingSecret » ou connexion client impossible | `AUTH_SECRET` manquant. |
| Le site s'ouvre sans mot de passe | `SITE_ACCESS_PASSWORD` est vide ou absent pour cet environnement ; pensez à redéployer après modification. |
| Galerie vide | Le seed (étape 5) n'a pas été lancé. |
| Les images n'apparaissent pas avant l'entrée | Normal : elles ne sont servies qu'après saisie du mot de passe. |

## Pour les développeurs

- Schéma canonique : PostgreSQL (`prisma/schema.prisma`, migrations dans `prisma/migrations/`). Sans `DATABASE_URL`, le développement local utilise une base SQLite dérivée automatiquement.
- Flux de production : `DATABASE_URL` Postgres → `npm run db:deploy` (génération du client + `prisma migrate deploy`, utilise `DIRECT_URL` si présent) → `npm run db:seed`.
- `npm run vercel-build` (exécuté par Vercel à la place de `npm run build`) = `db:deploy` puis `next build`. `postinstall` génère déjà le client Prisma.
- `npm run db:check` valide le schéma et les migrations PostgreSQL sans base réelle. `npm run build` fonctionne avec une `DATABASE_URL` Postgres factice (les pages sont rendues à la demande, aucun accès base au build).
- Mur de mot de passe : `src/proxy.ts` + `src/lib/site-access.ts` (cookie `site_access` httpOnly, `secure` en HTTPS, signé HMAC-SHA256 avec `SITE_ACCESS_SECRET`, validité 30 jours ; comparaison en temps constant). Désactivé si `SITE_ACCESS_PASSWORD` est vide. `/_next`, `favicon.ico` et `robots.txt` restent publics ; `robots.txt` interdit tout et `X-Robots-Tag: noindex` est ajouté partout. Les images sont servies sans l'optimiseur `/_next/image` pour rester derrière le mur.
- Limites connues : pas de limitation de tentatives (utilisez un mot de passe long) ; le mur est une protection légère de démonstration, pas un système d'authentification.
