# Mise en production — site et app Android

Priorité : démo du 3 décembre (simu, Stripe test), puis production. Aucun secret dans ce fichier.
Légende : ✅ fait (vérifié dans le dépôt) · 🟡 partiel · ⬜ à faire · ❓ à vérifier hors dépôt (console Vercel/Google/etc.).

## 1. Sécurité

| # | Point | État | Détail |
|---|---|---|---|
| 1.1 | Secrets hors du dépôt, `.env*` ignorés | ✅ | `.env.example` sans valeur ; secrets dans Vercel/GitHub (voir `INFRA-ET-VARIABLES.md`) |
| 1.2 | Rotation des secrets | 🟡 | Procédure `CRON_SECRET` documentée (§3 quater infra) ; à faire pour NextAuth, Neon, Resend, 17TRACK avant la prod |
| 1.3 | Clés Stripe live | ⬜ | Aujourd'hui test uniquement (`pk_test_…` dans `mobile/eas.json`, clé publique donc non secrète). Prod : clés live, nouveau webhook live, nouveau `pk_live` dans EAS, activer le compte Stripe (KYC) |
| 1.4 | Webhooks signés | ✅ | Stripe : en-tête `stripe-signature` vérifié (`api/stripe/webhook`) ; 17TRACK : signature SHA-256 (`api/webhooks/17track`) |
| 1.5 | Rate limiting | 🟡 | Présent sur auth mobile, médias, tila, candidature partenaire ; à étendre : login web, reset mot de passe, checkout, support |
| 1.6 | CORS | 🟡 | Aucun en-tête `Access-Control-*` : l'app native n'en a pas besoin ; à confirmer qu'aucun client web tiers n'appelle `/api/v1` |
| 1.7 | En-têtes de sécurité (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) | ⬜ | `next.config` ne pose que `X-Robots-Tag: noindex` (à retirer en prod pour l'indexation). Ajouter les en-têtes + CSP compatible Stripe/Google |
| 1.8 | Auth / sessions | ✅ | Mots de passe hachés, NextAuth, reset par jeton (`password-reset.ts`), OAuth Google ; ⬜ expiration/révocation des sessions mobiles à revoir |
| 1.9 | Validation des entrées | 🟡 | Contrôles manuels dans les routes ; pas de bibliothèque de schéma (zod absent) : au moins valider les routes publiques et paiement |
| 1.10 | Suppression de compte utilisateur | ⬜ | Seule une action admin existe ; pas de suppression/anonymisation en libre-service (site et app) — **exigée par Google Play et le RGPD** |
| 1.11 | RGPD : cookies, CGV, confidentialité, mentions légales | 🟡 | Bandeau cookies ✅ (`cookie-consent.tsx`), pages `support/terms` et `support/privacy` liées au pied de page ✅ ; ⬜ mentions légales (éditeur, hébergeur), contenu définitif validé juridiquement, registre des traitements, durées de conservation |
| 1.12 | Sauvegardes Neon | ❓ | Vérifier la fenêtre de restauration (PITR) du plan Neon ; définir une sauvegarde logique régulière avant la prod |
| 1.13 | Logs et monitoring | 🟡 | Journaux Vercel ; ⬜ Sentry (absent de `package.json` site et mobile), alertes erreurs 5xx |
| 1.14 | Audit des dépendances | 🟡 | Tests CI (`tests.yml`) ✅ ; ⬜ `npm audit` en CI, Dependabot absent ; Next.js signale des mises à jour de sécurité (`next upgrade --agent=security`) |
| 1.15 | Encodage UTF-8 des sources | ✅ | Test `utf8-sources.test.ts` (A-T93) |

## 2. Google Play

| # | Point | État |
|---|---|---|
| 2.1 | Compte développeur Google Play (25 USD, vérification d'identité ; organisation = D-U-N-S) | ❓ |
| 2.2 | Identifiant de package `com.epomta.app` | ✅ (`mobile/app.json`) |
| 2.3 | Build **AAB** signé (le workflow actuel `android-apk.yml` produit un APK de test ; profil `production` à passer en `app-bundle`) | 🟡 |
| 2.4 | Play App Signing (clé d'upload gérée par EAS) | ⬜ |
| 2.5 | `versionCode` auto-incrémenté (`autoIncrement` actif sur le profil production) | ✅ |
| 2.6 | Fiche store : titre, descriptions FR/EN, icône 512, bannière 1024×500 | ⬜ |
| 2.7 | Captures d'écran téléphone (min. 2, idéalement 4-8) | ⬜ |
| 2.8 | URL de politique de confidentialité publique (`/support/privacy`) | 🟡 (page existe, contenu à finaliser) |
| 2.9 | Formulaire Data safety (données collectées : e-mail, adresse, photos, push token, achats) | ⬜ |
| 2.10 | Classification du contenu (questionnaire IARC) | ⬜ |
| 2.11 | Test fermé : 12 testeurs pendant 14 jours consécutifs (compte personnel créé après nov. 2023) avant l'accès production | ⬜ — à lancer tôt |
| 2.12 | Suppression de compte in-app + page web de demande de suppression (obligatoire) | ⬜ (voir 1.10) |
| 2.13 | Paiements : biens physiques → Stripe autorisé, pas de Google Play Billing | ✅ |
| 2.14 | Compte de démonstration et instructions pour le relecteur Google | ⬜ |
| 2.15 | Pays de distribution, tarification (gratuite), contact développeur | ⬜ |

## 3. Infrastructure

| # | Point | État | Détail |
|---|---|---|---|
| 3.1 | Domaines (`epomta.com`, `simu.epomta.com`) | ✅ | OVH → Vercel (voir infra §1/§5) |
| 3.2 | Variables de production séparées de la simu | 🟡 | `eas.json` production pointe encore `https://simu.epomta.com` + clé Stripe test : à basculer |
| 3.3 | Migrations Prisma versionnées, appliquées au déploiement | ✅ | `prisma/migrations` (dernière : `0040_carriers_17track`) ; ⬜ procédure de rollback documentée |
| 3.4 | Vercel Hobby vs Pro | ⬜ | Hobby : cron 1×/jour max, usage non commercial interdit → **Pro requis pour la vente réelle** |
| 3.5 | Crons | ✅ | `vercel.json` quotidiens 06:00/07:00 UTC ; rattrapage `sweep.yml` toutes les 30 min (actif seulement sur `main`) ; poll à l'expédition `notifyShipped` |
| 3.6 | E-mails : SPF, DKIM, DMARC sur le domaine d'envoi (Resend) | ❓ | Vérifier dans Resend + OVH |
| 3.6 bis | Enquête de satisfaction : migration `0041_survey` appliquée en prod, lien d'avis testé depuis un vrai mail (domaine d'envoi vérifié, 3.6) | ⬜ | Voir INFRA §3 quinquies |
| 3.6 ter | Supprimer les créateurs/images d'illustration avant prod : `npm run db:simu-designers -- --remove` (ou Actions › Import designers simu › remove, secret `SIMU_DATABASE_URL`) sur la base concernée (colonne `Creator.simuIllustration`) ; ne jamais importer sur la prod | ⬜ | Voir INFRA §3 sexies |
| 3.7 | Sentry (site + app) | ⬜ | Voir 1.13 |
| 3.8 | `robots`/indexation | 🟡 | `robots.ts` présent mais `X-Robots-Tag: noindex` global : à lever pour la prod publique |
| 3.9 | Données : purge des données fictives, comptes de test (workflows `vidage-prod`/`vidage-preprod`) | 🟡 |
| 3.10 | 17TRACK : plan et quota adaptés au volume prod | ❓ |

## 4. EAS (app)

| # | Point | État | Détail |
|---|---|---|---|
| 4.1 | Profils de build `preview` / `production`, canaux `preview` / `production` | ✅ | `mobile/eas.json` |
| 4.2 | Build production Android (AAB) | ⬜ | Profil production sans `android.buildType: "app-bundle"` explicite |
| 4.3 | Mises à jour OTA (`expo-updates`, runtime `appVersion`) | ✅ | `app.json` : `runtimeVersion.policy = appVersion` ; OTA = JS seulement, tout changement natif → nouveau build + nouveau `versionCode` |
| 4.4 | Séquence OTA documentée | ✅ | `INFRA-ET-VARIABLES.md` §3 ter |
| 4.5 | Push : `expo-notifications` + `google-services.json` | 🟡 | Configuré (`app.json`, `push.ts`) ; ⬜ identifiants FCM v1 chargés dans EAS (`eas credentials`) et test sur appareil réel |
| 4.6 | Connexion Google : SHA-1 de la clé de **Play App Signing** ajoutée au client OAuth Android | ⬜ | Sinon la connexion Google échoue sur la version Play |
| 4.7 | Soumission `eas submit` Android (compte de service Play) | ⬜ | `submit.production` ne définit que iOS |

## 5. Plan conseillé

1. **Avant le 3 déc. (démo, simu)** : 1.5 (limites login/checkout), 1.11 (mentions légales), 4.5 (push réel), merge des lots et redéploiement.
2. **Dès maintenant (délais longs)** : 2.1 compte Play, 2.11 test fermé 12 testeurs / 14 jours, 1.10/2.12 suppression de compte.
3. **Avant la prod** : 1.3 Stripe live, 1.7 en-têtes/CSP, 3.4 Vercel Pro, 3.2 variables prod, 1.13/3.7 Sentry, 3.6 SPF/DKIM, 2.3/4.2 AAB, 4.6 SHA-1 Play.
