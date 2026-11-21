# Infrastructure, variables d'environnement et comptes

> Document privé (dépôt privé). **Aucune valeur secrète ici : uniquement des noms et des descriptions.**
> Déduit du code (`process.env`), de `.env.example`, de `vercel.json` et de `.github/workflows/`. « À compléter » = information inconnue, à renseigner par le propriétaire.
> Les noms de variables sont exacts ; les environnements indiqués sont la recommandation (à vérifier dans Vercel > Settings > Environment Variables).

## 1. Domaines

| Domaine | Usage |
|---|---|
| `epomta.com` (+ `www.epomta.com`) | **Officiel**, utilisé pour la démo (derrière le mur de mot de passe). Registrar : OVH — compte : À compléter |
| `epomta-demo.vercel.app` | **Tests uniquement** (historique avant le domaine). Liste blanche conservée dans `src/lib/origin.ts` |

## 2. Comptes et adresses e-mail associés

| Rôle | Compte / e-mail |
|---|---|
| Git / GitHub (dépôt) | Yamdjeu — yamdjeup@gmail.com |
| Admin du site (`ADMIN_EMAILS`) | africamadolo@gmail.com |
| Client de test | uccle20@gmail.com |
| Expéditeur des e-mails (`MAIL_FROM`) | contact@epomta.com |
| Client OAuth Google « Epomta web » (projet `epomta-demo`, créé le 3 nov. 2026) | africamadolo@gmail.com |
| Vercel (compte yamdjeup, plan Hobby) | yamdjeup@gmail.com |
| Neon (compte yamdjeup, organisation `africa-marketplace`, plan Free, région Frankfurt) | yamdjeup@gmail.com |
| Partenaire de test LoliPat | lolipat2026@gmail.com |
| Stripe « Epomta sandbox » | africamadolo@gmail.com (connexion Google, sans mot de passe ; pas de 2FA ni e-mail/téléphone de secours pour l'instant) |
| OVH (titulaire, admin, technique, facturation) | yamdjeup@gmail.com — réf. client pn1604783-ovh |
| Resend (équipe yamdjeup) | yamdjeup@gmail.com |
| GA4, Apple Developer | À compléter |

## 3. Variables par service

Légende : P = Production, Pv = Preview, T = Test/CI, L = local (`.env.local`). « Sensible » = à marquer *Sensitive* dans Vercel (illisible après création).

### Vercel (hébergement, variables du site)
| Variable | Env. | Rôle | Sensible | Où régénérer |
|---|---|---|---|---|
| `AUTH_SECRET` | P, Pv, L | Signature des sessions Auth.js (obligatoire en prod) | Oui | `npx auth secret` ; changer = déconnecte tout le monde |
| `AUTH_URL` | P (laisser vide recommandé) | URL publique ; `trustHost` est actif, donc inutile | Non | — |
| `NEXT_PUBLIC_SITE_URL` | P, Pv | Origine officielle (liens e-mails, webhook, cron) ; valeur attendue : `https://epomta.com` | Non | Vercel |
| `SITE_ACCESS_PASSWORD` | P, Pv | Mot de passe du mur d'accès (vide = mur désactivé) | Oui | Vercel (le définir sur Production pour epomta.com) |
| `SITE_ACCESS_SECRET` | P, Pv | Signature du cookie d'accès | Oui | Chaîne aléatoire longue |
| `ADMIN_EMAILS` | P, Pv | Liste d'administrateurs (e-mails séparés par des virgules) | Non | Vercel |
| `CRON_SECRET` | P | Protège `/api/alerts/run` et `/api/orders/sweep` (Vercel l'envoie en Bearer) | Oui | Chaîne aléatoire |
| `LEDGER_HOLD_DAYS` | P (optionnel) | Délai avant gains disponibles | Non | Vercel |
| `CONTACT_PHONE_LOCAL`, `CONTACT_PHONE_INTL` | P | Téléphones affichés ; cartes masquées si vides | Non | **Pas encore définis dans Vercel (à faire)** ; numéros réels : À compléter |
| `TMP_ATTACH_SECRET` | — | Ancienne route temporaire supprimée : **à supprimer sur Vercel** | Oui | — |
| `NODE_ENV`, `CI` | automatiques | Fournis par Vercel / CI | — | — |

Crons (`vercel.json`) : `/api/alerts/run` à 07:00 UTC, `/api/orders/sweep` à 06:00 UTC ; région `fra1`.

### Neon (PostgreSQL)
| Variable | Env. | Rôle | Sensible | Où régénérer |
|---|---|---|---|---|
| `DATABASE_URL` | P, Pv | Chaîne poolée de la base de production | Oui (contient un mot de passe) | Neon > Dashboard > Connect / Reset password |
| `DIRECT_URL` | P (optionnel) | Chaîne directe, pour `npm run db:deploy` | Oui | idem |
| `TEST_DATABASE_URL` | T, L | Branche Neon **jetable** pour tests ; jamais la prod | Oui | Neon > branche de test > Reset password |
| `NEON_DATABASE_URL` (secret GitHub) | CI | Utilisé par un workflow (déploiement/migrations) | Oui | Neon |

Compte Neon : yamdjeup@gmail.com (organisation `africa-marketplace`). Nom du projet / branche de test : À compléter.

### Stripe (mode test uniquement)
| Variable | Env. | Rôle | Sensible | Où régénérer |
|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | P, Pv | Clé secrète `sk_test_…` : paiement et remboursements | Oui | Stripe > Développeurs > Clés API (Roll key) |
| `STRIPE_WEBHOOK_SECRET` | P | Signature du webhook `https://epomta.com/api/stripe/webhook` | Oui | Stripe > Webhooks > endpoint > Signing secret |
| `TEST_STRIPE_SECRET_KEY` (secret GitHub) | CI | Clé test pour les tests automatisés | Oui | Stripe |

Pas de clé live. Compte Stripe « Epomta sandbox » : africamadolo@gmail.com.

### Resend / e-mails
Équipe Resend : yamdjeup (yamdjeup@gmail.com) ; clé API `epomta-prod` (permission Sending access) ; simu : clé séparée ; garde-fou : aucune adresse réelle tierce dans la base simu ; plan Free (3 000 e-mails/mois, 100/jour) ; passer à Pro (20 $/mois) avant l'ouverture.

| Variable | Env. | Rôle | Sensible | Où régénérer |
|---|---|---|---|---|
| `RESEND_API_KEY` | P, S (simu : clé dédiée distincte, Sending access, limitée) | Envoi d'e-mails (prioritaire sur Gmail) | Oui | Resend > API Keys |
| `MAIL_FROM` (alias lu : `EMAIL_FROM`) | P, S | Expéditeur : `Epomta <contact@epomta.com>` ; domaine à vérifier dans Resend (DNS chez OVH) | Non | — |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | P (repli) | SMTP Gmail ; mot de passe d'application, pas le mot de passe du compte | Oui | Compte Google > Mots de passe d'application |

### Google (Cloud / OAuth / Places)
| Variable | Env. | Rôle | Sensible | Où régénérer |
|---|---|---|---|---|
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | P | Connexion Google (client « Epomta web ») ; URI de redirection : `https://epomta.com/api/auth/callback/google` | Secret : oui | Google Cloud > API et services > Identifiants |
| `GOOGLE_PLACES_API_KEY` | P (optionnel) | Saisie d'adresse (Places API New), restreinte | Oui | Google Cloud |
| `GOOGLE_TRANSLATE_API_KEY`, `DEEPL_API_KEY`, `DEEPL_API_URL`, `TRANSLATE_PROVIDER` | optionnel | Traduction automatique, si activée | Clés : oui | À compléter |

Compte Google Cloud : africamadolo@gmail.com, projet `epomta-demo`. Client « Epomta web » : redirect URIs `epomta.com` et `www.epomta.com` ajoutées ; connexion Google testée OK sur epomta.com.


### Application mobile (Expo / EAS) et API `/api/v1`
| Variable | Env. | Rôle | Sensible | Où la créer |
|---|---|---|---|---|
| `AUTH_SECRET` (serveur) | S, P, Pv | Signe aussi les jetons mobiles (accès 1 h, refresh 30 j) | Oui | `npx auth secret` ; le changer déconnecte aussi l'app |
| `GOOGLE_MOBILE_CLIENT_IDS` (serveur) | S, P | Audiences acceptées pour l'id_token Google de l'app : ID Android + ID Web, séparés par une virgule | Non | Vercel > Settings > Environment Variables |
| `EXPO_PUBLIC_API_URL` | `mobile/eas.json` | URL de l'API appelée par l'app (simu : `https://simu.epomta.com`) | Non | `mobile/eas.json` (profils preview/production) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | `mobile/eas.json` | ID client OAuth Android (package `com.epomta.app` + SHA-1 du keystore EAS) ; Google Sign-In natif le retrouve par package + SHA-1, sans redirection navigateur | Non | Google Cloud > Identifiants > ID client Android |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `mobile/eas.json` | ID client Web « Epomta web » : audience de l'id_token (Google Sign-In natif, @react-native-google-signin) | Non | Google Cloud > Identifiants |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `mobile/eas.json` | Clé publiable Stripe `pk_test_…` pour la PaymentSheet (renseignée dans eas.json le 16/11/2026) | Non (publique) | Stripe > Développeurs > Clés API (mode test) |
| `STRIPE_SECRET_KEY` (serveur) | S | Crée les PaymentIntents mobiles (déjà utilisée par le site) | Oui | Stripe > Clés API |
| `EXPO_TOKEN` | poste du développeur | Authentifie `eas build` ; ne jamais le committer | Oui | expo.dev > Access tokens (à révoquer après la démo, voir ENVIRONNEMENTS §11) |

Règle : toute variable ajoutée ou modifiée doit être reportée ici (nom, environnement, rôle, sensible, où la créer). Firebase/FCM (push, lot 4) : à ajouter à ce tableau lors du lot.

### Autres connexions sociales (optionnel, inactives si vides)
`AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET`, `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET` : secrets sensibles ; callback `https://epomta.com/api/auth/callback/<fournisseur>`.

### Notifications push et mesure
| Variable | Rôle | Sensible |
|---|---|---|
| `VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clé publique Web Push | Non |
| `VAPID_PRIVATE_KEY` | Clé privée Web Push (`npx web-push generate-vapid-keys`) | Oui |
| `VAPID_SUBJECT` | Contact `mailto:` du push | Non |
| Push mobile (Expo/FCM) | Aucune variable serveur : le serveur envoie via l'API Expo (`https://exp.host/--/api/v2/push/send`). Côté utilisateur : projet Firebase, app Android `com.epomta.app`, `google-services.json` placé dans `mobile/` ET commité (non secret, non ignoré par git : EAS Build n'envoie que les fichiers suivis ; `android.googleServicesFile` est déjà dans `app.json`), puis clé de compte de service FCM v1 envoyée via `eas credentials` (Android > Google Service Account > FCM V1). Sans ces éléments, l'app compile et l'activation du push affiche un message d'erreur. | Fichier/clé : oui (ne jamais les committer ni les coller dans le chat) |
| `NEXT_PUBLIC_GA_ID` | ID de mesure GA4 `G-…` ; compte GA4 : À compléter | Non |

### GitHub / CI
Secrets du dépôt (Settings > Secrets and variables > Actions) :
- Tests : `TEST_DATABASE_URL`, `TEST_STRIPE_SECRET_KEY`.
- Base : `NEON_DATABASE_URL`.
- App iOS (workflow de build) : `APPLE_TEAM_ID`, `IOS_CERTIFICATE_P12_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`, `IOS_PROVISIONING_PROFILE_NAME`, `KEYCHAIN_PASSWORD`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_KEY_P8_BASE64`. Compte Apple Developer : À compléter.

### OVH (domaine)
Pas de variable. Offre Standard ; epomta.com expire le 10/11/2027 (renouvellement automatique) ; contact du domaine validé le 12/11/2026 ; **aucun moyen de paiement enregistré** ; service Emails lié. Enregistrements DNS : A/CNAME vers Vercel, enregistrements SPF/DKIM de Resend. Compte OVH : yamdjeup@gmail.com (réf. pn1604783-ovh).

### 3 bis. 17TRACK (suivi transporteurs) et capture Stripe

- Compte 17TRACK créé le 18/11/2026 (essai gratuit, sans société) : e-mail `contact@epomta.com`, nom Epomta, site epomta.com, volume déclaré ≤ 10 000 colis/mois, exigence « API de suivi en temps réel », transporteurs réglementés « Aucun besoin ». Mot de passe et clé : jamais dans ce fichier ni dans le dépôt.
- Variable à créer dans Vercel (simu, preprod, prod) : `TRACK17_API_KEY` (clé API 17TRACK). Absente : mode manuel dégradé (le créateur marque livré / retour reçu). Quota gratuit visible au tableau de bord : 200 suivis de colis et 10 suivis fret aérien (AirWayBill). clé API récupérée dans api.17track.net > Settings (non stockée ici) ; à coller dans Vercel ; webhook pas encore configuré (à faire après déploiement, avec l'URL de l'endpoint).
- Intégration (API V2.4, doc officielle) : enregistrement `POST https://api.17track.net/track/v2.4/register` (en-tête `17token`) à l'expédition du colis et à l'expédition du retour ; webhook `POST https://epomta.com/api/webhooks/17track` (colis V2.4, à saisir dans api.17track.net > Settings après déploiement). Signature vérifiée : en-tête `sign` = SHA-256 hex de « corps + / + clé API ». Statut `Delivered` : colis passé « Livré » (+ mail) ou retour passé « Reçu ». Limites officielles : 3 requêtes/s ; 1 quota par numéro suivi ; suivi stoppé 15 jours après livraison ou 30 jours sans événement ; 200 suivis gratuits uniques (comptes créés après le 07/01/2026), tarifs ultérieurs à vérifier au tableau de bord. Adaptateur remplaçable : `src/lib/tracking-provider.ts`.
- `PAYMENT_CAPTURE_ON_CONFIRM` = `1` : autorisation Stripe à la commande, encaissement à la confirmation du créateur (24 h) ; absente ou autre valeur : ancien flux (48 h). Fen?tre d'autorisation carte Stripe : environ 7 jours par d?faut (couvre les 24 h). Le cron Vercel est quotidien : pour la pr?cision des relances/expiration, `/api/orders/sweep` est rappelé toutes les 30 min par GitHub Actions (`.github/workflows/sweep.yml`, en-tête `Authorization: Bearer CRON_SECRET`, voir §3 quater) ; le cron Vercel reste quotidien (06:00 UTC, limite Hobby).

### 3 quater. Sweep des commandes (CRON_SECRET, GitHub Actions)

- `CRON_SECRET` (Vercel) : Production + Preview + Preview/simu, nouvelle valeur le 21/11/2026, type Sensitive (non relisible après saisie). La même valeur est dans le secret GitHub `CRON_SECRET`. Aucune valeur n'est consignée ici.
- Secrets GitHub Actions (Settings > Secrets and variables > Actions) : `SWEEP_URL` = `https://simu.epomta.com` (sans slash final) ; `CRON_SECRET` = même valeur que Vercel.
- Workflow `.github/workflows/sweep.yml` : `*/30 * * * *` + `workflow_dispatch`, appelle `GET $SWEEP_URL/api/orders/sweep` avec `Authorization: Bearer CRON_SECRET`. Le schedule ne tourne que sur la branche par défaut (`main`). Quota gratuit dépôt privé : 2000 min/mois (30 min ≈ 1440 min/mois).
- `vercel.json` : cron quotidien `/api/orders/sweep` à 06:00 UTC (limite Hobby : 1 exécution/jour) ; `/api/alerts/run` à 07:00 UTC.
- Poll 17TRACK à l'expédition : `notifyShipped` (`src/lib/order-notify.ts`) relit 17TRACK juste après l'expédition (colis déjà livré).
- Mur mot de passe (`src/proxy.ts`, `PUBLIC_ALERTS`) : toute route appelée par une machine (cron Vercel, GitHub Actions, webhooks) doit y figurer, sinon 401 avant même le Bearer ; actuellement : `alerts/run`, `orders/sweep`, `stripe/webhook`, `webhooks/17track`. Corrigé le 21/11 (`orders/sweep` manquait : le cron Vercel et le workflow recevaient 401). Toute nouvelle route cron/webhook : l'ajouter dans `PUBLIC_ALERTS` (test `proxy-machine-routes.test.ts`, lit `vercel.json`).
- Rotation de `CRON_SECRET` : 1) générer une nouvelle chaîne aléatoire ; 2) la saisir dans Vercel (Production, Preview, Preview/simu) ; 3) la mettre à jour dans le secret GitHub `CRON_SECRET` ; 4) Redeploy du Preview simu (et Production) ; 5) lancer le workflow à la main (`workflow_dispatch`) et vérifier le succès.

## 4. Secrets à régénérer

- **Clé Stripe `sk_test_…`** (`STRIPE_SECRET_KEY`, `TEST_STRIPE_SECRET_KEY`) : à régénérer si elle a été exposée (Stripe > Roll key), puis mettre à jour Vercel et GitHub.
- **Mot de passe de la branche Neon de test** (`TEST_DATABASE_URL`) : à réinitialiser si exposé, puis mettre à jour le secret GitHub et `.env.local`.
- `TMP_ATTACH_SECRET` : supprimer sur Vercel.
- Après tout changement de variable Vercel : redéployer.

## 5. Réglages externes liés au domaine officiel `epomta.com`

Redirect URI Google (et Facebook/Apple) ; endpoint webhook Stripe `https://epomta.com/api/stripe/webhook` ; domaine d'envoi Resend vérifié ; `NEXT_PUBLIC_SITE_URL=https://epomta.com` ; `capacitor.config.ts` (app mobile) pointe encore sur `epomta-demo.vercel.app`.

## 6. Plans tarifaires à adopter pour la mise en production commerciale

> Tarifs et conditions **à vérifier sur les pages officielles** de chaque service avant décision.

| Service | Situation actuelle | Action pour l'ouverture commerciale |
|---|---|---|
| Vercel | Hobby (usage non commercial ; stockage Functions à 7,76 / 10 Go) | Passer à **Pro** (usage commercial obligatoire, quotas supérieurs) |
| Neon | Free (Frankfurt) | Passer à **Launch** : base toujours active, restauration à un instant donné, branches protégées |
| Stripe | Sandbox (clés test) | Compte **live** : vérification de l'entreprise, compte bancaire, clés live, **nouveau webhook** live, commission par transaction à intégrer dans les prix |
| Google Cloud | Application OAuth en mode test | **Publier** l'app OAuth (hors mode test), écran de consentement complet ; surveiller les quotas Places |
| Resend | Free (3 000 e-mails/mois, 100/jour) | Passer à Pro (20 $/mois) avant l'ouverture |
| OVH | Domaine epomta.com | Renouvellement automatique, DNS à jour, contact titulaire exact ; réserver **epomta.eu / epomta.fr** |
| GitHub | Dépôt privé | Vérifier le plan (Actions, minutes CI) |
| GA4 | Gratuit | Vérifier la conformité du consentement |
| Traduction (DEEPL_*, GOOGLE_TRANSLATE_*) | Optionnel | Vérifier les quotas et la facturation si activée |

## 7. Checklist pré-ouverture

- [ ] Retirer le mur d'accès (SITE_ACCESS_PASSWORD) **seulement après** régularisation des droits d'image
- [ ] Passer aux clés Stripe live et au webhook live
- [ ] Régénérer les secrets exposés (voir §4)
- [ ] Renseigner les vrais numéros de téléphone (CONTACT_PHONE_LOCAL, CONTACT_PHONE_INTL)
- [ ] Relecture CNIL (mentions, cookies, données personnelles)
- [ ] Politique de retour validée (qui paie le retour, remboursements partiels)
- [ ] Plans Vercel Pro et Neon Launch activés
- [ ] Stripe : activer la 2FA et un e-mail/téléphone de secours ; inviter yamdjeup comme administrateur
- [ ] OVH : enregistrer un moyen de paiement (renouvellement auto du 10/11/2027)
- [ ] Redirection www.epomta.com → epomta.com (308)
- [ ] Vercel : `NEXT_PUBLIC_SITE_URL=https://epomta.com`, `SITE_ACCESS_PASSWORD` défini, `CONTACT_PHONE_*` définis
- [ ] Webhook Stripe pointant sur `https://epomta.com/api/stripe/webhook`

## 8. Sécurité

Statut : `[x]` fait, `[ ]` à faire. Seuls les points confirmés par le propriétaire sont cochés.


### 3 quinquies. Enquête de satisfaction (« Rate your experience »)

- Migration `0041_survey` (à appliquer avant le déploiement : `npm run db:deploy`) : tables `SurveyConfig`, `SurveyQuestion`, `SurveyResponse`, `SurveyAnswer`, colonne `SubOrder.reviewMailSentAt`, questions de départ.
- Aucune variable d'environnement ni cron nouveau : le mail d'avis (J+3, délai réglable en admin) part via le sweep existant (`runSubOrderSweep`, GitHub Actions */30). Désactiver l'enquête en admin (Configuration > Enquête) : plus de mail d'avis, mail de clôture inchangé.
- Page publique `/fr|en/avis/<jeton 48 hex>` ajoutée à `PUBLIC_ALERTS` (`src/proxy.ts`) : le jeton unique tient lieu d'authentification. Résultats et export CSV : admin uniquement.

### 3 sexies. Créateurs d'illustration (simu uniquement)
- Migration  042_simu_designers (7 colonnes sur Creator, additives).
- Import : définir SIMU_DATABASE_URL (base simu, jamais prod), puis 
pm run db:simu-designers. Retrait avant prod : 
pm run db:simu-designers -- --remove. Données : prisma/simu-designers.json (150 profils, images distantes marquées illustration, coordonnées privées non affichées).
- Variable locale uniquement (non Vercel) : SIMU_DATABASE_URL.

### 3 ter. Séquence OTA (app Android, canal preview, runtime 1.0.0)



`mobile/app.json` est commité avec : slug `afrique-marketplace`, owner `epomta-app`, `extra.eas.projectId` `6b0ae666-4795-4bfc-b96f-060673117e1f`, `updates.url` correspondante, package `com.epomta.app`. **Ne jamais** faire `git checkout -- mobile/app.json` ni changer le slug : `node scripts/check-mobile-config.mjs` échoue si l'un de ces champs change.



Dans cmd, depuis la racine du dépôt (une commande par ligne ; seul `EXPO_TOKEN` est un secret, à ne jamais commiter) :



1. `set EXPO_TOKEN=<votre jeton>`

2. `set EXPO_PUBLIC_API_URL=https://simu.epomta.com`

3. `set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<valeur de mobile/eas.json>` et `set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<valeur de mobile/eas.json>` (identifiants publics)

4. `set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=<pk_test de mobile/eas.json>`

5. `node scripts/check-mobile-config.mjs` (doit afficher « Config mobile OK »)

6. `cd mobile`

7. `npx eas-cli update --channel preview --platform android --message "<message>"`


### Comptes
- [ ] Resend : passer de Free à Pro (20 $/mois) avant l'ouverture
- [ ] 2FA activée : Vercel, Neon, GitHub, OVH, Stripe, Google (africamadolo et yamdjeup), Resend
- [ ] E-mail de secours + téléphone de secours sur chaque compte (Stripe : connexion Google uniquement, aucun secours aujourd'hui)
- [ ] Gestionnaire de mots de passe utilisé pour tous les comptes ; codes de récupération stockés hors ligne
- [ ] Second administrateur sur Vercel, Neon, Stripe, OVH (éviter un compte unique)
- [ ] Revue trimestrielle des accès (membres, clés API, applications OAuth autorisées)

### Secrets et variables
- [ ] Toutes les variables secrètes Vercel marquées « Sensitive »
- [ ] Rotation des clés exposées : Stripe `sk_test`, mot de passe de la branche Neon de test, clé Resend si partagée
- [ ] Mot de passe du mur d'accès fort et unique ; `SITE_ACCESS_SECRET` distinct
- [ ] Secrets distincts par environnement (webhook Stripe live ≠ sandbox ; Production ≠ Preview)
- [ ] Clés API à droits minimaux (Resend : Sending access ; Places restreinte à Places API New)
- [ ] `TMP_ATTACH_SECRET` supprimé sur Vercel
- [ ] Jamais de secret dans le dépôt, les logs ou le chat ; analyse de secrets GitHub (secret scanning) activée

### GitHub
- [ ] Branche `main` protégée : PR obligatoire + CI verte obligatoire, pas de force-push
- [ ] Dependabot / alertes de sécurité activées

### Stripe
- [ ] Webhook live avec son propre secret de signature, distinct du sandbox
- [ ] Clés live uniquement côté Vercel Production ; restreintes (restricted keys) si possible

### OVH / domaine
- [x] Verrou de transfert actif
- [x] DNSSEC actif
- [ ] Moyen de paiement enregistré (renouvellement auto du 10/11/2027)
- [ ] SPF, DKIM et DMARC configurés pour `contact@epomta.com`

### Application et données
- [ ] En-têtes de sécurité (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors) vérifiés dans `next.config.ts`
- [ ] Limitation de débit sur connexion, inscription, mur d'accès, formulaires publics
- [ ] Sauvegardes Neon : restauration à un instant donné (plan Launch) ; test de restauration documenté
- [ ] Accès aux journaux (Vercel, Neon, Stripe) limité aux administrateurs ; pas de données personnelles dans les logs
- [ ] RGPD : consentement GA4 (déjà en place), politique de confidentialité, droit d'accès/suppression, registre des traitements
- [ ] Mise à jour régulière des dépendances (`npm audit`)
