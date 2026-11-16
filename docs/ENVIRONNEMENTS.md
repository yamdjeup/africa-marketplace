# Environnements : prod, simu, preprod

Document de planification. Rien n'a été exécuté sur Neon, Vercel, OVH ou Stripe.

## 1. Cible

| Env | Domaine | Base Neon (branche) | Rôle |
|---|---|---|---|
| prod | epomta.com | `main` (VIDE : seulement l'admin) | clients réels |
| simu | simu.epomta.com | `simu` (copie de la base actuelle) | démonstration non vide |
| preprod | preprod.epomta.com | `preprod` | validation de chaque lot avant prod |
| CI | (aucun) | `ci-test` (jetable) | tests automatiques (`TEST_DATABASE_URL`) |

Choix retenu : **un seul projet Vercel**, un même code, trois environnements.
- `main` = Production (epomta.com).
- Branche git `preprod` = domaine preprod.epomta.com ; branche git `simu` = domaine simu.epomta.com (environnement Preview avec variables propres à chaque branche).
- Flux d'un lot : push sur `preprod` → validation → merge sur `main` (prod). `simu` n'est mise à jour que sur décision (merge de `main`).
- Pas de chemins `/simu` ni `/preprod` : le mur d'accès, les cookies, Stripe et Google s'appuient sur le nom de domaine.

Particularité Vercel : les crons (`vercel.json`) ne tournent que sur la production. Sur simu et preprod, rien ne part tout seul ; déclencher à la main si besoin (`curl -H "Authorization: Bearer <CRON_SECRET>" https://preprod.epomta.com/api/orders/sweep`).

## 2. Changements de code nécessaires (non faits, à demander ensuite)

1. `src/lib/origin.ts` : `ALLOWED_HOSTS` contient `epomta.com`, `www.epomta.com`, `epomta-demo.vercel.app`. Ajouter `simu.epomta.com` et `preprod.epomta.com` (ou lire une variable `ALLOWED_HOSTS`), sinon les retours Stripe Connect/checkout retombent sur la valeur par défaut.
2. `src/app/robots.ts` : renvoie `disallow: /` PARTOUT (y compris prod). Pour la prod : autoriser l'indexation quand `VERCEL_ENV === "production"` ; garder `disallow: /` ailleurs (le mur de mot de passe ajoute déjà `noindex`).
3. Bandeau d'environnement discret (simu/preprod) pour ne pas confondre : optionnel, via `NEXT_PUBLIC_APP_ENV`.
4. Constantes en dur à garder : `contact@epomta.com` (`src/lib/contact.ts`) et le repli `https://epomta.com` quand `NEXT_PUBLIC_SITE_URL`/`AUTH_URL` sont absents : donc définir ces deux variables sur chaque env.

## 3. Variables d'environnement par environnement

Définies dans Vercel > Settings > Environment Variables (Production : prod ; Preview : cocher « branche spécifique » `simu` puis `preprod`). Ne jamais copier de secret dans git ni dans une discussion.

| Variable | prod | simu | preprod |
|---|---|---|---|
| `DATABASE_URL` / `DIRECT_URL` | branche Neon `main` (pooled / directe) | branche `simu` | branche `preprod` |
| `NEXT_PUBLIC_SITE_URL`, `AUTH_URL` | https://epomta.com | https://simu.epomta.com | https://preprod.epomta.com |
| `AUTH_SECRET` | propre à la prod | différent | différent |
| `SITE_ACCESS_PASSWORD`, `SITE_ACCESS_SECRET` | décision : retirer le mur à l'ouverture publique ; sinon mot de passe propre | mot de passe distinct | mot de passe distinct |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | clé live (quand le mode réel est décidé) ; mode test tant que non | clé **sandbox** + webhook simu | clé **sandbox** + webhook preprod |
| `OPENAI_API_KEY`, `TILA_PROVIDER`, `TILA_MODEL` | clé de prod | même clé ou clé dédiée avec plafond bas | idem |
| **Permissions clé OpenAI** (`OPENAI_API_KEY`) | clé **Restricted** ; Chat completions (`/v1/chat/completions`) = **Request** (seul endpoint appelé par Tílá, `provider.ts` l.49) ; Responses = **Write** ; Audio = **Request** (lot 2) ; tout le reste = **None** | clé dédiée simu/preprod, limite mensuelle (€) sur le projet OpenAI ; variable (Secret) dans Vercel Preview·simu et Preview·preprod, redéploiement requis ; Tílá validé sur simu et preprod le 16/11/2026 | idem |
| `RESEND_API_KEY`, `MAIL_FROM` (ou `GMAIL_*`) | prod (domaine vérifié) | **vide** (aucun envoi) ou domaine de test | domaine de test, destinataires = adresses de test |
| `ADMIN_EMAILS` | adresse(s) admin | adresses de test | adresses de test |
| `CRON_SECRET` | propre | distinct | distinct |
| `NEXT_PUBLIC_GA_ID` | ID GA4 | **absente** | **absente** |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | paire de prod | paire distincte | paire distincte |
| `AUTH_GOOGLE_ID/SECRET` (et Facebook/Apple si actifs) | même client OAuth possible | idem | idem |
| `GOOGLE_PLACES_API_KEY`, `CONTACT_PHONE_*` | prod | idem | idem |
| `TEST_DATABASE_URL` | n'existe pas dans Vercel : secret GitHub Actions (branche `ci-test`) | | |

Piège simu : la copie contient les adresses réelles de test. Sans clé e-mail sur simu, aucun message ne part ; ne pas la renseigner. Vider `PushSubscription` après la copie (étape 4).

## 4. Étapes (dans l'ordre sûr)

### Phase A : préparer sans toucher à la prod
1. **Sauvegarde** : Neon > Backup & Restore : noter l'heure ; créer la branche `backup-avant-vidage` depuis `main` (copie instantanée, à conserver ≥ 30 jours).
2. **Branche simu** : Neon > Branches > New branch, parent `main`, nom `simu`, « current data ». Copier ses deux chaînes de connexion (pooled et direct).
3. **Branche preprod** : même chose, nom `preprod`, parent `main` (maintenant ; elle sera réinitialisée plus tard depuis la prod si besoin). Branche `ci-test` : parent `main`, puis sera vidée par les tests (la CI applique les migrations).
4. **Assainir simu** (console SQL Neon, branche `simu` UNIQUEMENT, vérifier le nom de la branche en haut avant d'exécuter) :
   ```sql
   BEGIN;
   TRUNCATE "PushSubscription", "PasswordResetToken", "PasswordResetAttempt", "TilaRateHit", "CartInterest", "CheckoutHold" CASCADE;
   COMMIT;
   ```
   (Les adresses e-mail restent : ce sont des adresses de test, et aucun envoi n'est configuré.)
5. **Git** : créer les branches `simu` et `preprod` depuis `main` (`git branch simu main ; git branch preprod main ; git push origin simu preprod`).

### Phase B : Vercel
6. Settings > Domains : ajouter `simu.epomta.com` en l'assignant à la branche git `simu`, `preprod.epomta.com` à la branche `preprod`. Vercel affiche l'enregistrement DNS à créer.
7. Settings > Environment Variables : créer les variables du tableau §3 pour Preview avec la branche `simu`, puis pour la branche `preprod` (une ligne par variable et par branche). Vérifier que Production garde les valeurs actuelles.
8. Settings > Git : branche de production = `main` (inchangé).

### Phase C : OVH (DNS)
9. Zone DNS epomta.com > ajouter deux `CNAME` : `simu` et `preprod` → la cible indiquée par Vercel (généralement `cname.vercel-dns.com.`). Attendre la propagation (quelques minutes) ; Vercel affiche « Valid Configuration » et émet le certificat.

### Phase D : services tiers
10. **Google OAuth** (console Google Cloud > Identifiants > client OAuth) : ajouter les URI de redirection autorisées `https://simu.epomta.com/api/auth/callback/google` et `https://preprod.epomta.com/api/auth/callback/google`, et les origines JavaScript `https://simu.epomta.com`, `https://preprod.epomta.com`. Même opération pour Facebook/Apple si activés.
11. **Stripe** (compte, mode **test/sandbox**) : créer un point de terminaison webhook par env (`https://simu.epomta.com/api/stripe/webhook`, `https://preprod.epomta.com/api/stripe/webhook`), copier chaque secret `whsec_…` dans la variable `STRIPE_WEBHOOK_SECRET` de l'env correspondant. Stripe Connect : ajouter les URL de retour des deux domaines si la configuration les exige.
12. **Resend** : domaine epomta.com déjà vérifié pour la prod ; simu sans clé ; preprod : clé dédiée limitée.

### Phase E : déployer et vérifier simu et preprod
13. `git push origin simu preprod` (ou « Redeploy » dans Vercel). Le script `vercel-build` exécute `node scripts/db.mjs deploy && next build` : les migrations Prisma sont appliquées à la base de CHAQUE env au déploiement (aucune action manuelle). Contrôler dans les logs de build : « migrations applied ».
14. Vérifier sur chaque domaine : mur d'accès avec son propre mot de passe ; connexion e-mail et Google ; catalogue (simu non vide) ; panier + paiement Stripe test (carte 4242 4242 4242 4242) ; l'en-tête `x-robots-tag: noindex` ; aucune donnée GA ; Tílá répond.
15. **Contrôle de la copie simu** : comparer les compteurs avec la prod (`SELECT count(*) FROM "Order"` etc.) ; se connecter avec un compte de test existant.

### Phase F : point de contrôle bloquant, puis vidage de la prod (TOUTE DERNIÈRE ÉTAPE)
Règle ferme : **on ne vide jamais la prod avant que sa copie soit faite ET vérifiée sur simu.epomta.com.** Aucune autre étape ne dépend du vidage ; il se fait en dernier.

16. **Point de contrôle bloquant : vérifications faites par l'utilisateur sur simu.epomta.com** (comparer avec epomta.com, côte à côte) :
    - [ ] Nombre de pièces du catalogue : identique à la prod (compter en admin ou `SELECT count(*) FROM "Product"` sur les deux branches).
    - [ ] Partenaires (`Supplier`) : même nombre, mêmes statuts ; ouvrir 2 fiches partenaires.
    - [ ] Commandes (`Order`, `SubOrder`) : même nombre ; ouvrir 3 commandes (statuts, montants, colis).
    - [ ] Comptes (`User`) : même nombre ; se connecter avec 2 comptes de test (client, partenaire).
    - [ ] Images visibles : 5 fiches produit, 2 fiches créateur, l'avatar de Tílá, des images partenaires (médias en base).
    - [ ] Connexion admin sur simu OK (menu Admin, liste des commandes, versements).
    - [ ] Aucun e-mail réel envoyé depuis simu pendant les tests.
    - **STOP : ne pas continuer sans l'accord écrit de l'utilisateur** (message explicite « OK vider la prod »). Sans cet accord, s'arrêter ici : la prod reste intacte.
17. Après l'accord écrit : annoncer la fenêtre de maintenance ; re-créer une branche Neon de secours fraîche `secours-avant-vidage-AAAAMMJJ` depuis `main` (même si celle de l'étape 1 existe) et contrôler qu'elle est visible dans Neon > Branches. Ne pas la supprimer avant plusieurs semaines.
18. Essai du script §5 sur `preprod` : FAIT et validé (workflow `Essai vidage preprod`, rollback puis commit : 1 User admin, 6 Category, le reste à 0). Le bug d'accueil sur base vide (`heroProduct` undefined) a été corrigé (A-T50).
19. Vidage de la prod, autorisé par l'utilisateur : workflow manuel `Vidage prod` (`.github/workflows/vidage-prod.yml`, secret `PROD_DIRECT_URL` = URL Neon DIRECTE de la branche production). Lancer d'abord en mode rollback (défaut), lire les compteurs avant/après, puis mode commit avec la confirmation `OUI-VIDER-LA-PROD-epomta`. Prérequis : branche de secours Neon (étape 17) et accord écrit.
20. Vérifier : connexion admin sur epomta.com ; catalogue vide (accueil sans erreur) ; `ADMIN_EMAILS` de la prod = adresse(s) conservée(s). En cas de problème : restaurer depuis la branche de secours (Neon > Restore) puis reprendre.
21. Selon la date d'ouverture : retirer ou garder le mur d'accès ; activer l'indexation dans `robots` (changement de code §2.2).
## 5. Script de vidage de la prod (à exécuter UNIQUEMENT sur la branche `main` de Neon, étape 19)

Prérequis : accord écrit de l'utilisateur (étape 16), branche de secours créée (étape 17), essai sur `preprod` fait (étape 18).

Conservé : la table `User` limitée aux adresses admin, `Category` (structure du catalogue), `_prisma_migrations`. Tout le reste est vidé, y compris les médias stockés en base (`MediaFile`).

Sécurités : tout est dans une transaction ; un garde-fou refuse de s'exécuter sans la confirmation explicite ; la dernière ligne est `ROLLBACK` : il faut la remplacer volontairement par `COMMIT`.

```sql
BEGIN;

-- Confirmation explicite : décommenter UNIQUEMENT quand toutes les conditions ci-dessus sont remplies
-- SET LOCAL app.vidage_confirme = 'OUI-VIDER-LA-PROD-epomta';

DO $$
BEGIN
  IF coalesce(current_setting('app.vidage_confirme', true), '') <> 'OUI-VIDER-LA-PROD-epomta' THEN
    RAISE EXCEPTION 'Vidage refuse : confirmation absente (voir docs/ENVIRONNEMENTS.md, etape 16-19)';
  END IF;
END $$;

-- Contrôle visuel : base et comptes gardés (doit contenir uniquement l'admin)
SELECT current_database() AS base, current_user AS utilisateur;
SELECT id, email FROM "User" WHERE lower(email) IN ('admin@exemple.tld'); -- remplacer par l'adresse admin réelle

TRUNCATE
  "OrderItem", "SubOrder", "ReturnRequest", "LedgerEntry", "Payout", "Order",
  "CheckoutHold", "CartInterest", "RestockWatch",
  "StockMovement", "ProductVariant", "Product", "CreatorSlugAlias", "Creator",
  "MediaFile",
  "PartnerAudit", "ApplicationFile", "SupplierApplication", "Supplier",
  "PushSubscription", "Favorite", "Address",
  "PasswordResetToken", "PasswordResetAttempt", "TilaRateHit"
CASCADE;

DELETE FROM "User" WHERE lower(email) NOT IN ('admin@exemple.tld'); -- même adresse que ci-dessus

-- Contrôles (tout doit être 0 sauf User = nombre d'admins et Category > 0)
SELECT 'User' t, count(*) FROM "User"
UNION ALL SELECT 'Category', count(*) FROM "Category"
UNION ALL SELECT 'Order', count(*) FROM "Order"
UNION ALL SELECT 'Product', count(*) FROM "Product"
UNION ALL SELECT 'Supplier', count(*) FROM "Supplier";

ROLLBACK; -- remplacer par COMMIT; seulement après avoir relu les contrôles ci-dessus
```

Notes :
- Les noms de tables viennent de `prisma/schema.prisma` (27 modèles). Si une table n'existe pas (erreur), corriger le nom et relancer : la transaction annulée ne laisse rien à moitié fait.
- Le compte admin est déterminé par la variable `ADMIN_EMAILS` (pas par un champ en base) : l'adresse conservée doit y figurer. Si l'admin se connecte uniquement par Google, la ligne `User` doit déjà exister (sinon se reconnecter après le vidage recrée le compte).
- Essayer d'abord ce même script sur la branche `preprod` (copie de la prod) pour valider le résultat.
- Le compteur de numéros de commande repart de zéro si la séquence est liée à la table : prévoir un préfixe différent si des numéros AM-… déjà envoyés ne doivent pas être réutilisés (à confirmer avant exécution).

## 6. Migrations Prisma par environnement

- Les migrations vivent dans `prisma/migrations` (versionnées). `vercel-build` applique `db deploy` à la base de l'environnement qui se déploie : preprod en premier (push sur `preprod`), prod ensuite (merge sur `main`). Une migration cassée est donc détectée en preprod avant la prod.
- Ne jamais lancer `db push` ni `migrate reset` contre prod ou simu.
- Avant la prod : vérifier dans preprod que la migration s'applique sur une copie récente.

## 7. CI

- GitHub Actions utilise `TEST_DATABASE_URL` : une branche Neon dédiée `ci-test` (jamais preprod, jamais simu). Les tests `*.db.test.ts` y créent et suppriment leurs données.
- Garder les tests existants (tsc, eslint, vitest) comme porte avant tout push sur `preprod` et `main`.

## 8. Cron

- `vercel.json` : `/api/alerts/run` (07:00 UTC) et `/api/orders/sweep` (06:00 UTC), région fra1. Actifs seulement en production ; sur prod vidée ils ne font rien d'utile, sans risque.
- Les tester sur preprod/simu à la main avec le `CRON_SECRET` de l'env.

## 9. Coûts probables et risques

Coûts (à vérifier sur les grilles actuelles) :
- **Vercel Hobby** : usage non commercial seulement. Un site marchand réel suppose le plan **Pro** (≈ 20 USD/mois par membre) ; crons Hobby limités à un par jour (déjà le cas).
- **Neon** : le plan gratuit limite le nombre de branches et les heures de calcul ; 4 branches (main, simu, preprod, ci-test) + 1 sauvegarde peuvent dépasser le gratuit ; plan **Launch** (≈ 19 USD/mois, paiement à l'usage). Les branches s'endorment seules (premier appel plus lent).
- **Stripe** : mode test gratuit ; en live, frais par transaction. **Resend** : plan gratuit limité en volume. **OVH** : DNS déjà payé. **OpenAI** : au jeton ; fixer un plafond mensuel par clé.

Risques :
- Exécuter le vidage sur la mauvaise branche Neon : vérifier le nom de branche affiché, garder la sauvegarde (étape 1), essayer d'abord sur preprod.
- Variables mélangées (clé live sur simu, `DATABASE_URL` de prod sur preprod) : relire le tableau §3 ligne par ligne, puis tester une commande sur chaque env et contrôler dans quelle base elle apparaît.
- Courriels de test envoyés depuis simu à d'anciennes adresses : ne pas renseigner de clé e-mail sur simu.
- Webhook Stripe : un secret de webhook par endpoint ; sinon les paiements restent « en attente ».
- Google OAuth : URI de redirection manquante → erreur `redirect_uri_mismatch`.
- Données personnelles dans simu : la copie contient des comptes (adresses de test de l'utilisateur) ; si des vrais clients existent plus tard, ne plus copier la prod vers simu sans anonymisation.
- Migrations divergentes entre envs : toujours merger dans l'ordre preprod → main.

## 10. Journal d'avancement (15/11/2026)

Hôtes Neon (hôte seul, jamais de mot de passe ni de chaîne de connexion complète) :
- prod : `ep-mute-mouse-b9qc9uxw.c-7.eu-central-1.aws.neon.tech`
- preprod : `ep-bold-mud-b99fqpet.c-7.eu-central-1.aws.neon.tech`

| Élément | Statut |
|---|---|
| Demande de l'utilisateur | preprod ET prod doivent être vidées (admin + Category conservés) |
| Preprod vidée réellement | FAIT (workflow « Essai vidage preprod », rollback puis commit, 15/11/2026) |
| Accueil sur base vide corrigé | FAIT (A-T50) |
| Essai rollback prod | FAIT (workflow « Vidage prod », 15/11/2026, compteurs identiques avant/après) |
| Vidage commit prod | **FAIT** le 15/11/2026 vers 15h13 (workflow « Vidage prod », run #3 ; le run #2 avait été refusé par le garde-fou : confirmation absente, rien modifié). AVANT : 10 User, 6 Category, 25 Product, 3 Supplier, 49 Order, 48 SubOrder, 17 MediaFile, 24 Favorite, 3 Address, 16 TilaRateHit. APRÈS COMMIT : 1 User, 6 Category, 0 pour le reste. epomta.com/fr vérifié visuellement (accueil vide sans erreur). Reste à vérifier : connexion admin et menu Administration. |

Vidage commit prod : mode `commit`, confirmation exacte `OUI-VIDER-LA-PROD-epomta`. Secours (à conserver plusieurs semaines) : branche Neon `backup-avant-vidage`.

## 11. Éléments critiques avant la mise en prod / ouverture au public

- **Passer au flux protégé avant l'ouverture au public** : `emails-farfetch` → simu → test → preprod → test → `main` (prod). Aujourd'hui `main` (prod) reçoit le code en premier et simu/preprod suivent ; rien ne doit arriver en prod sans validation préalable en simu puis preprod.
- **Stripe sandbox actif sur simu et preprod** (validé sur simu) ; clé live uniquement en prod au lancement.

Séquence cmd (flux protégé) :

```
cd C:\Users\SF6521\PycharmProjects\afrique-marketplace
git fetch
git checkout simu
git merge --no-ff emails-farfetch -m "merge emails-farfetch vers simu"
git push origin simu
REM tests manuels sur https://simu.epomta.com, puis :
git checkout preprod
git merge --no-ff simu -m "merge simu vers preprod"
git push origin preprod
REM tests sur https://preprod.epomta.com, puis :
git checkout main
git merge --no-ff preprod -m "merge preprod vers main (prod)"
git push origin main
```
