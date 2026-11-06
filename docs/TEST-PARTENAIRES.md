# Recette — espace partenaires et commandes (mode test)

Complété à chaque lot. Aucun argent réel : seul le registre des paiements (lot D) est en mode test.

## Comptes
| Rôle | Compte |
|---|---|
| Admin | compte dont l'e-mail est dans `ADMIN_EMAILS` (Vercel) |
| Candidat / partenaire | un 2e compte client (autre e-mail), ou le même sans rôle admin |
| Partenaires de démo | KeNoF, Nathalie Morère, Cruzz Taylor (lignes en base, via `npm run db:seed-suppliers`) |

## Lot A — Candidature et validation admin
URLs (remplacer `fr` par `en` pour l'anglais) : `/fr/fournisseur`, `/fr/fournisseur/candidature`, `/fr/admin/candidatures`, `/fr/admin/fournisseurs`, `/fr/account`.

- [ ] Visiteur non connecté sur `/fr/fournisseur/candidature` : invité à se connecter.
- [ ] Visiteur sur `/fr/fournisseur/tableau-de-bord` : redirigé vers la connexion.
- [ ] Client connecté (non partenaire) sur le tableau de bord partenaire : redirigé vers la candidature.
- [ ] Client sur `/fr/admin` : renvoyé à l'accueil.
- [ ] Client remplit et envoie la candidature : message « Candidature envoyée ». **E-mail** de confirmation au candidat ; **e-mail** à l'admin.
- [ ] Renvoyer une 2e candidature en attente : message « déjà en cours d'examen ».
- [ ] Candidature sans lien ET sans fichier : refusée avec message clair (« lien OU fichier »).
- [ ] Candidature sans lien mais avec 1 à 5 fichiers (JPG/PNG/WebP/PDF, 4 Mo max chacun) : miniatures affichées, suppression possible, envoi accepté.
- [ ] Fichier .exe/.txt renommé en .jpg, ou > 4 Mo : refusé. 6e fichier : refusé.
- [ ] Admin : la fiche candidature montre les miniatures (clic = agrandi) et les PDF (téléchargeables) ; un autre client ne peut pas ouvrir ces fichiers.
- [ ] Admin, `/fr/admin/candidatures` : la candidature apparaît « À traiter ».
- [ ] Admin « Demander des infos » (avec message) : statut mis à jour ; **e-mail** au candidat ; le candidat voit la note et peut renvoyer.
- [ ] Admin « Refuser » : **e-mail** de refus.
- [ ] Admin « Accepter » : **e-mail** de bienvenue ; le candidat accède à `/fr/fournisseur/tableau-de-bord`.
- [ ] Partenaire : modifier le profil (nom, pays, bio, vidéo) puis recharger : valeurs conservées.
- [ ] Admin, `/fr/account` : bloc « Vue (admin) » (absent pour un non-admin).
- [ ] Admin : choisir un partenaire de démo puis « Ouvrir la vue Partenaire » : espace affiché en lecture seule (bandeau « Vue admin »), « Quitter » ramène au compte.
- [ ] Un admin ne peut pas ouvrir l'espace d'un vrai partenaire (seules les démos sont proposées).

## Lot B — Œuvres et stock
(à venir)

## Lot C — Commandes par partenaire
(à venir)

## Lot D — Paiements (test)
(à venir)
