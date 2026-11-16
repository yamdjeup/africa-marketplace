# Infrastructure, variables d'environnement et comptes

> Document privÃ© (dÃ©pÃ´t privÃ©). **Aucune valeur secrÃ¨te ici : uniquement des noms et des descriptions.**
> DÃ©duit du code (`process.env`), de `.env.example`, de `vercel.json` et de `.github/workflows/`. Â« Ã€ complÃ©ter Â» = information inconnue, Ã  renseigner par le propriÃ©taire.
> Les noms de variables sont exacts ; les environnements indiquÃ©s sont la recommandation (Ã  vÃ©rifier dans Vercel > Settings > Environment Variables).

## 1. Domaines

| Domaine | Usage |
|---|---|
| `epomta.com` (+ `www.epomta.com`) | **Officiel**, utilisÃ© pour la dÃ©mo (derriÃ¨re le mur de mot de passe). Registrar : OVH â€” compte : Ã€ complÃ©ter |
| `epomta-demo.vercel.app` | **Tests uniquement** (historique avant le domaine). Liste blanche conservÃ©e dans `src/lib/origin.ts` |

## 2. Comptes et adresses e-mail associÃ©s

| RÃ´le | Compte / e-mail |
|---|---|
| Git / GitHub (dÃ©pÃ´t) | Yamdjeu â€” yamdjeup@gmail.com |
| Admin du site (`ADMIN_EMAILS`) | africamadolo@gmail.com |
| Client de test | uccle20@gmail.com |
| ExpÃ©diteur des e-mails (`MAIL_FROM`) | contact@epomta.com |
| Client OAuth Google Â« Epomta web Â» (projet `epomta-demo`, crÃ©Ã© le 3 nov. 2026) | africamadolo@gmail.com |
| Vercel (compte yamdjeup, plan Hobby) | yamdjeup@gmail.com |
| Neon (compte yamdjeup, organisation `africa-marketplace`, plan Free, rÃ©gion Frankfurt) | yamdjeup@gmail.com |
| Partenaire de test LoliPat | lolipat2026@gmail.com |
| Stripe Â« Epomta sandbox Â» | africamadolo@gmail.com (connexion Google, sans mot de passe ; pas de 2FA ni e-mail/tÃ©lÃ©phone de secours pour l'instant) |
| OVH (titulaire, admin, technique, facturation) | yamdjeup@gmail.com â€” rÃ©f. client pn1604783-ovh |
| Resend (Ã©quipe yamdjeup) | yamdjeup@gmail.com |
| GA4, Apple Developer | Ã€ complÃ©ter |

## 3. Variables par service

LÃ©gende : P = Production, Pv = Preview, T = Test/CI, L = local (`.env.local`). Â« Sensible Â» = Ã  marquer *Sensitive* dans Vercel (illisible aprÃ¨s crÃ©ation).

### Vercel (hÃ©bergement, variables du site)
| Variable | Env. | RÃ´le | Sensible | OÃ¹ rÃ©gÃ©nÃ©rer |
|---|---|---|---|---|
| `AUTH_SECRET` | P, Pv, L | Signature des sessions Auth.js (obligatoire en prod) | Oui | `npx auth secret` ; changer = dÃ©connecte tout le monde |
| `AUTH_URL` | P (laisser vide recommandÃ©) | URL publique ; `trustHost` est actif, donc inutile | Non | â€” |
| `NEXT_PUBLIC_SITE_URL` | P, Pv | Origine officielle (liens e-mails, webhook, cron) ; valeur attendue : `https://epomta.com` | Non | Vercel |
| `SITE_ACCESS_PASSWORD` | P, Pv | Mot de passe du mur d'accÃ¨s (vide = mur dÃ©sactivÃ©) | Oui | Vercel (le dÃ©finir sur Production pour epomta.com) |
| `SITE_ACCESS_SECRET` | P, Pv | Signature du cookie d'accÃ¨s | Oui | ChaÃ®ne alÃ©atoire longue |
| `ADMIN_EMAILS` | P, Pv | Liste d'administrateurs (e-mails sÃ©parÃ©s par des virgules) | Non | Vercel |
| `CRON_SECRET` | P | ProtÃ¨ge `/api/alerts/run` et `/api/orders/sweep` (Vercel l'envoie en Bearer) | Oui | ChaÃ®ne alÃ©atoire |
| `LEDGER_HOLD_DAYS` | P (optionnel) | DÃ©lai avant gains disponibles | Non | Vercel |
| `CONTACT_PHONE_LOCAL`, `CONTACT_PHONE_INTL` | P | TÃ©lÃ©phones affichÃ©s ; cartes masquÃ©es si vides | Non | **Pas encore dÃ©finis dans Vercel (Ã  faire)** ; numÃ©ros rÃ©els : Ã€ complÃ©ter |
| `TMP_ATTACH_SECRET` | â€” | Ancienne route temporaire supprimÃ©e : **Ã  supprimer sur Vercel** | Oui | â€” |
| `NODE_ENV`, `CI` | automatiques | Fournis par Vercel / CI | â€” | â€” |

Crons (`vercel.json`) : `/api/alerts/run` Ã  07:00 UTC, `/api/orders/sweep` Ã  06:00 UTC ; rÃ©gion `fra1`.

### Neon (PostgreSQL)
| Variable | Env. | RÃ´le | Sensible | OÃ¹ rÃ©gÃ©nÃ©rer |
|---|---|---|---|---|
| `DATABASE_URL` | P, Pv | ChaÃ®ne poolÃ©e de la base de production | Oui (contient un mot de passe) | Neon > Dashboard > Connect / Reset password |
| `DIRECT_URL` | P (optionnel) | ChaÃ®ne directe, pour `npm run db:deploy` | Oui | idem |
| `TEST_DATABASE_URL` | T, L | Branche Neon **jetable** pour tests ; jamais la prod | Oui | Neon > branche de test > Reset password |
| `NEON_DATABASE_URL` (secret GitHub) | CI | UtilisÃ© par un workflow (dÃ©ploiement/migrations) | Oui | Neon |

Compte Neon : yamdjeup@gmail.com (organisation `africa-marketplace`). Nom du projet / branche de test : Ã€ complÃ©ter.

### Stripe (mode test uniquement)
| Variable | Env. | RÃ´le | Sensible | OÃ¹ rÃ©gÃ©nÃ©rer |
|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | P, Pv | ClÃ© secrÃ¨te `sk_test_â€¦` : paiement et remboursements | Oui | Stripe > DÃ©veloppeurs > ClÃ©s API (Roll key) |
| `STRIPE_WEBHOOK_SECRET` | P | Signature du webhook `https://epomta.com/api/stripe/webhook` | Oui | Stripe > Webhooks > endpoint > Signing secret |
| `TEST_STRIPE_SECRET_KEY` (secret GitHub) | CI | ClÃ© test pour les tests automatisÃ©s | Oui | Stripe |

Pas de clÃ© live. Compte Stripe Â« Epomta sandbox Â» : africamadolo@gmail.com.

### Resend / e-mails
Ã‰quipe Resend : yamdjeup (yamdjeup@gmail.com) ; clÃ© API `epomta-prod` (permission Sending access) ; plan Free (3 000 e-mails/mois, 100/jour) ; passer Ã  Pro (20 $/mois) avant l'ouverture.

| Variable | Env. | RÃ´le | Sensible | OÃ¹ rÃ©gÃ©nÃ©rer |
|---|---|---|---|---|
| `RESEND_API_KEY` | P | Envoi d'e-mails (prioritaire sur Gmail) | Oui | Resend > API Keys |
| `MAIL_FROM` (alias lu : `EMAIL_FROM`) | P | ExpÃ©diteur : `Epomta <contact@epomta.com>` ; domaine Ã  vÃ©rifier dans Resend (DNS chez OVH) | Non | â€” |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | P (repli) | SMTP Gmail ; mot de passe d'application, pas le mot de passe du compte | Oui | Compte Google > Mots de passe d'application |

### Google (Cloud / OAuth / Places)
| Variable | Env. | RÃ´le | Sensible | OÃ¹ rÃ©gÃ©nÃ©rer |
|---|---|---|---|---|
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | P | Connexion Google (client Â« Epomta web Â») ; URI de redirection : `https://epomta.com/api/auth/callback/google` | Secret : oui | Google Cloud > API et services > Identifiants |
| `GOOGLE_PLACES_API_KEY` | P (optionnel) | Saisie d'adresse (Places API New), restreinte | Oui | Google Cloud |
| `GOOGLE_TRANSLATE_API_KEY`, `DEEPL_API_KEY`, `DEEPL_API_URL`, `TRANSLATE_PROVIDER` | optionnel | Traduction automatique, si activÃ©e | ClÃ©s : oui | Ã€ complÃ©ter |

Compte Google Cloud : africamadolo@gmail.com, projet `epomta-demo`. Client Â« Epomta web Â» : redirect URIs `epomta.com` et `www.epomta.com` ajoutÃ©es ; connexion Google testÃ©e OK sur epomta.com.

### Application mobile (Expo / EAS) et API `/api/v1`
| Variable | Env. | RÃ´le | Sensible | OÃ¹ la crÃ©er |
|---|---|---|---|---|
| `AUTH_SECRET` (serveur) | S, P, Pv | Signe aussi les jetons mobiles (accÃ¨s 1 h, refresh 30 j) | Oui | `npx auth secret` ; le changer dÃ©connecte aussi l'app |
| `GOOGLE_MOBILE_CLIENT_IDS` (serveur) | S, P | Audiences acceptÃ©es pour l'id_token Google de l'app : ID Android + ID Web, sÃ©parÃ©s par une virgule | Non | Vercel > Settings > Environment Variables |
| `EXPO_PUBLIC_API_URL` | `mobile/eas.json` | URL de l'API appelÃ©e par l'app (simu : `https://simu.epomta.com`) | Non | `mobile/eas.json` (profils preview/production) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | `mobile/eas.json` | ID client OAuth Android (package `com.epomta.app` + SHA-1 du keystore EAS) | Non | Google Cloud > Identifiants > ID client Android |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `mobile/eas.json` | ID client Web Â« Epomta web Â» (utilisÃ© par expo-auth-session) | Non | Google Cloud > Identifiants |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `mobile/eas.json` | ClÃ© publiable Stripe `pk_test_â€¦` pour la PaymentSheet (placeholder `pk_test_REMPLACER` Ã  remplacer) | Non (publique) | Stripe > DÃ©veloppeurs > ClÃ©s API (mode test) |
| `STRIPE_SECRET_KEY` (serveur) | S | CrÃ©e les PaymentIntents mobiles (dÃ©jÃ  utilisÃ©e par le site) | Oui | Stripe > ClÃ©s API |
| `EXPO_TOKEN` | poste du dÃ©veloppeur | Authentifie `eas build` ; ne jamais le committer | Oui | expo.dev > Access tokens (Ã  rÃ©voquer aprÃ¨s la dÃ©mo, voir ENVIRONNEMENTS Â§11) |

RÃ¨gle : toute variable ajoutÃ©e ou modifiÃ©e doit Ãªtre reportÃ©e ici (nom, environnement, rÃ´le, sensible, oÃ¹ la crÃ©er). Firebase/FCM (push, lot 4) : Ã  ajouter Ã  ce tableau lors du lot.

### Autres connexions sociales (optionnel, inactives si vides)
`AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET`, `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET` : secrets sensibles ; callback `https://epomta.com/api/auth/callback/<fournisseur>`.

### Notifications push et mesure
| Variable | RÃ´le | Sensible |
|---|---|---|
| `VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ClÃ© publique Web Push | Non |
| `VAPID_PRIVATE_KEY` | ClÃ© privÃ©e Web Push (`npx web-push generate-vapid-keys`) | Oui |
| `VAPID_SUBJECT` | Contact `mailto:` du push | Non |
| `NEXT_PUBLIC_GA_ID` | ID de mesure GA4 `G-â€¦` ; compte GA4 : Ã€ complÃ©ter | Non |

### GitHub / CI
Secrets du dÃ©pÃ´t (Settings > Secrets and variables > Actions) :
- Tests : `TEST_DATABASE_URL`, `TEST_STRIPE_SECRET_KEY`.
- Base : `NEON_DATABASE_URL`.
- App iOS (workflow de build) : `APPLE_TEAM_ID`, `IOS_CERTIFICATE_P12_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`, `IOS_PROVISIONING_PROFILE_NAME`, `KEYCHAIN_PASSWORD`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_KEY_P8_BASE64`. Compte Apple Developer : Ã€ complÃ©ter.

### OVH (domaine)
Pas de variable. Offre Standard ; epomta.com expire le 10/11/2027 (renouvellement automatique) ; contact du domaine validÃ© le 12/11/2026 ; **aucun moyen de paiement enregistrÃ©** ; service Emails liÃ©. Enregistrements DNS : A/CNAME vers Vercel, enregistrements SPF/DKIM de Resend. Compte OVH : yamdjeup@gmail.com (rÃ©f. pn1604783-ovh).

## 4. Secrets Ã  rÃ©gÃ©nÃ©rer

- **ClÃ© Stripe `sk_test_â€¦`** (`STRIPE_SECRET_KEY`, `TEST_STRIPE_SECRET_KEY`) : Ã  rÃ©gÃ©nÃ©rer si elle a Ã©tÃ© exposÃ©e (Stripe > Roll key), puis mettre Ã  jour Vercel et GitHub.
- **Mot de passe de la branche Neon de test** (`TEST_DATABASE_URL`) : Ã  rÃ©initialiser si exposÃ©, puis mettre Ã  jour le secret GitHub et `.env.local`.
- `TMP_ATTACH_SECRET` : supprimer sur Vercel.
- AprÃ¨s tout changement de variable Vercel : redÃ©ployer.

## 5. RÃ©glages externes liÃ©s au domaine officiel `epomta.com`

Redirect URI Google (et Facebook/Apple) ; endpoint webhook Stripe `https://epomta.com/api/stripe/webhook` ; domaine d'envoi Resend vÃ©rifiÃ© ; `NEXT_PUBLIC_SITE_URL=https://epomta.com` ; `capacitor.config.ts` (app mobile) pointe encore sur `epomta-demo.vercel.app`.

## 6. Plans tarifaires Ã  adopter pour la mise en production commerciale

> Tarifs et conditions **Ã  vÃ©rifier sur les pages officielles** de chaque service avant dÃ©cision.

| Service | Situation actuelle | Action pour l'ouverture commerciale |
|---|---|---|
| Vercel | Hobby (usage non commercial ; stockage Functions Ã  7,76 / 10 Go) | Passer Ã  **Pro** (usage commercial obligatoire, quotas supÃ©rieurs) |
| Neon | Free (Frankfurt) | Passer Ã  **Launch** : base toujours active, restauration Ã  un instant donnÃ©, branches protÃ©gÃ©es |
| Stripe | Sandbox (clÃ©s test) | Compte **live** : vÃ©rification de l'entreprise, compte bancaire, clÃ©s live, **nouveau webhook** live, commission par transaction Ã  intÃ©grer dans les prix |
| Google Cloud | Application OAuth en mode test | **Publier** l'app OAuth (hors mode test), Ã©cran de consentement complet ; surveiller les quotas Places |
| Resend | Free (3 000 e-mails/mois, 100/jour) | Passer Ã  Pro (20 $/mois) avant l'ouverture |
| OVH | Domaine epomta.com | Renouvellement automatique, DNS Ã  jour, contact titulaire exact ; rÃ©server **epomta.eu / epomta.fr** |
| GitHub | DÃ©pÃ´t privÃ© | VÃ©rifier le plan (Actions, minutes CI) |
| GA4 | Gratuit | VÃ©rifier la conformitÃ© du consentement |
| Traduction (DEEPL_*, GOOGLE_TRANSLATE_*) | Optionnel | VÃ©rifier les quotas et la facturation si activÃ©e |

## 7. Checklist prÃ©-ouverture

- [ ] Retirer le mur d'accÃ¨s (SITE_ACCESS_PASSWORD) **seulement aprÃ¨s** rÃ©gularisation des droits d'image
- [ ] Passer aux clÃ©s Stripe live et au webhook live
- [ ] RÃ©gÃ©nÃ©rer les secrets exposÃ©s (voir Â§4)
- [ ] Renseigner les vrais numÃ©ros de tÃ©lÃ©phone (CONTACT_PHONE_LOCAL, CONTACT_PHONE_INTL)
- [ ] Relecture CNIL (mentions, cookies, donnÃ©es personnelles)
- [ ] Politique de retour validÃ©e (qui paie le retour, remboursements partiels)
- [ ] Plans Vercel Pro et Neon Launch activÃ©s
- [ ] Stripe : activer la 2FA et un e-mail/tÃ©lÃ©phone de secours ; inviter yamdjeup comme administrateur
- [ ] OVH : enregistrer un moyen de paiement (renouvellement auto du 10/11/2027)
- [ ] Redirection www.epomta.com â†’ epomta.com (308)
- [ ] Vercel : `NEXT_PUBLIC_SITE_URL=https://epomta.com`, `SITE_ACCESS_PASSWORD` dÃ©fini, `CONTACT_PHONE_*` dÃ©finis
- [ ] Webhook Stripe pointant sur `https://epomta.com/api/stripe/webhook`

## 8. SÃ©curitÃ©

Statut : `[x]` fait, `[ ]` Ã  faire. Seuls les points confirmÃ©s par le propriÃ©taire sont cochÃ©s.

### Comptes
- [ ] Resend : passer de Free Ã  Pro (20 $/mois) avant l'ouverture
- [ ] 2FA activÃ©e : Vercel, Neon, GitHub, OVH, Stripe, Google (africamadolo et yamdjeup), Resend
- [ ] E-mail de secours + tÃ©lÃ©phone de secours sur chaque compte (Stripe : connexion Google uniquement, aucun secours aujourd'hui)
- [ ] Gestionnaire de mots de passe utilisÃ© pour tous les comptes ; codes de rÃ©cupÃ©ration stockÃ©s hors ligne
- [ ] Second administrateur sur Vercel, Neon, Stripe, OVH (Ã©viter un compte unique)
- [ ] Revue trimestrielle des accÃ¨s (membres, clÃ©s API, applications OAuth autorisÃ©es)

### Secrets et variables
- [ ] Toutes les variables secrÃ¨tes Vercel marquÃ©es Â« Sensitive Â»
- [ ] Rotation des clÃ©s exposÃ©es : Stripe `sk_test`, mot de passe de la branche Neon de test, clÃ© Resend si partagÃ©e
- [ ] Mot de passe du mur d'accÃ¨s fort et unique ; `SITE_ACCESS_SECRET` distinct
- [ ] Secrets distincts par environnement (webhook Stripe live â‰  sandbox ; Production â‰  Preview)
- [ ] ClÃ©s API Ã  droits minimaux (Resend : Sending access ; Places restreinte Ã  Places API New)
- [ ] `TMP_ATTACH_SECRET` supprimÃ© sur Vercel
- [ ] Jamais de secret dans le dÃ©pÃ´t, les logs ou le chat ; analyse de secrets GitHub (secret scanning) activÃ©e

### GitHub
- [ ] Branche `main` protÃ©gÃ©e : PR obligatoire + CI verte obligatoire, pas de force-push
- [ ] Dependabot / alertes de sÃ©curitÃ© activÃ©es

### Stripe
- [ ] Webhook live avec son propre secret de signature, distinct du sandbox
- [ ] ClÃ©s live uniquement cÃ´tÃ© Vercel Production ; restreintes (restricted keys) si possible

### OVH / domaine
- [x] Verrou de transfert actif
- [x] DNSSEC actif
- [ ] Moyen de paiement enregistrÃ© (renouvellement auto du 10/11/2027)
- [ ] SPF, DKIM et DMARC configurÃ©s pour `contact@epomta.com`

### Application et donnÃ©es
- [ ] En-tÃªtes de sÃ©curitÃ© (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors) vÃ©rifiÃ©s dans `next.config.ts`
- [ ] Limitation de dÃ©bit sur connexion, inscription, mur d'accÃ¨s, formulaires publics
- [ ] Sauvegardes Neon : restauration Ã  un instant donnÃ© (plan Launch) ; test de restauration documentÃ©
- [ ] AccÃ¨s aux journaux (Vercel, Neon, Stripe) limitÃ© aux administrateurs ; pas de donnÃ©es personnelles dans les logs
- [ ] RGPD : consentement GA4 (dÃ©jÃ  en place), politique de confidentialitÃ©, droit d'accÃ¨s/suppression, registre des traitements
- [ ] Mise Ã  jour rÃ©guliÃ¨re des dÃ©pendances (`npm audit`)
