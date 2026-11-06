# Recette — espace partenaires et commandes (mode test)

Complété à chaque lot. Aucun argent réel : seul le registre des paiements (lot D) est en mode test.

## Comptes
| Rôle | Compte |
|---|---|
| Admin | compte dont l'e-mail est dans `ADMIN_EMAILS` (Vercel) |
| Candidat / fournisseur | un 2e compte client (autre e-mail), ou le même sans rôle admin |
| Fournisseurs de démo | KeNoF, Nathalie Morère, Cruzz Taylor (lignes en base, via `npm run db:seed-suppliers`) |

## Lot A — Candidature et validation admin
URLs (remplacer `fr` par `en` pour l'anglais) : `/fr/fournisseur`, `/fr/fournisseur/candidature`, `/fr/admin/candidatures`, `/fr/admin/fournisseurs`, `/fr/account`.

- [ ] Visiteur non connecté sur `/fr/fournisseur/candidature` : invité à se connecter.
- [ ] Visiteur sur `/fr/fournisseur/tableau-de-bord` : redirigé vers la connexion.
- [ ] Client connecté (non fournisseur) sur le tableau de bord fournisseur : redirigé vers la candidature.
- [ ] Client sur `/fr/admin` : renvoyé à l'accueil.
- [ ] Client remplit et envoie la candidature : message « Candidature envoyée ». **E-mail** de confirmation au candidat ; **e-mail** à l'admin.
- [ ] Renvoyer une 2e candidature en attente : message « déjà en cours d'examen ».
- [ ] Admin, `/fr/admin/candidatures` : la candidature apparaît « À traiter ».
- [ ] Admin « Demander des infos » (avec message) : statut mis à jour ; **e-mail** au candidat ; le candidat voit la note et peut renvoyer.
- [ ] Admin « Refuser » : **e-mail** de refus.
- [ ] Admin « Accepter » : **e-mail** de bienvenue ; le candidat accède à `/fr/fournisseur/tableau-de-bord`.
- [ ] Fournisseur : modifier le profil (nom, pays, bio, vidéo) puis recharger : valeurs conservées.
- [ ] Admin, `/fr/account` : bloc « Vue (admin) » (absent pour un non-admin).
- [ ] Admin : choisir un fournisseur de démo puis « Ouvrir la vue Fournisseur » : espace affiché en lecture seule (bandeau « Vue admin »), « Quitter » ramène au compte.
- [ ] Un admin ne peut pas ouvrir l'espace d'un vrai fournisseur (seules les démos sont proposées).

## Lot B — Œuvres et stock
(à venir)

## Lot C — Commandes par fournisseur
(à venir)

## Lot D — Paiements (test)
(à venir)
