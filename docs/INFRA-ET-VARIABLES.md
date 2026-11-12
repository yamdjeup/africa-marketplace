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
| Stripe, Resend, OVH, GA4, Apple Developer : e-mail du compte | À compléter |

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
| `CONTACT_PHONE_LOCAL`, `CONTACT_PHONE_INTL` | P | Téléphones affichés ; cartes masquées si vides | Non | Numéros réels : À compléter |
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

Pas de clé live. Compte Stripe / e-mail : À compléter.

### Resend / e-mails
| Variable | Env. | Rôle | Sensible | Où régénérer |
|---|---|---|---|---|
| `RESEND_API_KEY` | P | Envoi d'e-mails (prioritaire sur Gmail) | Oui | Resend > API Keys |
| `MAIL_FROM` (alias lu : `EMAIL_FROM`) | P | Expéditeur : `Epomta <contact@epomta.com>` ; domaine à vérifier dans Resend (DNS chez OVH) | Non | — |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | P (repli) | SMTP Gmail ; mot de passe d'application, pas le mot de passe du compte | Oui | Compte Google > Mots de passe d'application |

### Google (Cloud / OAuth / Places)
| Variable | Env. | Rôle | Sensible | Où régénérer |
|---|---|---|---|---|
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | P | Connexion Google (client « Epomta web ») ; URI de redirection : `https://epomta.com/api/auth/callback/google` | Secret : oui | Google Cloud > API et services > Identifiants |
| `GOOGLE_PLACES_API_KEY` | P (optionnel) | Saisie d'adresse (Places API New), restreinte | Oui | Google Cloud |
| `GOOGLE_TRANSLATE_API_KEY`, `DEEPL_API_KEY`, `DEEPL_API_URL`, `TRANSLATE_PROVIDER` | optionnel | Traduction automatique, si activée | Clés : oui | À compléter |

Compte Google Cloud : africamadolo@gmail.com, projet `epomta-demo`.

### Autres connexions sociales (optionnel, inactives si vides)
`AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET`, `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET` : secrets sensibles ; callback `https://epomta.com/api/auth/callback/<fournisseur>`.

### Notifications push et mesure
| Variable | Rôle | Sensible |
|---|---|---|
| `VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clé publique Web Push | Non |
| `VAPID_PRIVATE_KEY` | Clé privée Web Push (`npx web-push generate-vapid-keys`) | Oui |
| `VAPID_SUBJECT` | Contact `mailto:` du push | Non |
| `NEXT_PUBLIC_GA_ID` | ID de mesure GA4 `G-…` ; compte GA4 : À compléter | Non |

### GitHub / CI
Secrets du dépôt (Settings > Secrets and variables > Actions) :
- Tests : `TEST_DATABASE_URL`, `TEST_STRIPE_SECRET_KEY`.
- Base : `NEON_DATABASE_URL`.
- App iOS (workflow de build) : `APPLE_TEAM_ID`, `IOS_CERTIFICATE_P12_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`, `IOS_PROVISIONING_PROFILE_NAME`, `KEYCHAIN_PASSWORD`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_KEY_P8_BASE64`. Compte Apple Developer : À compléter.

### OVH (domaine)
Pas de variable. Enregistrements DNS : A/CNAME vers Vercel, enregistrements SPF/DKIM de Resend. Compte OVH : À compléter.

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
| Resend | Offre actuelle À compléter | Vérifier le quota d'envoi mensuel et passer au plan adapté |
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
