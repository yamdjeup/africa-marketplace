> **Recadrage (16/11/2026)** : ce document liste les **fonctions** et données du site à retrouver dans l'app. La **structure et la navigation** de l'app suivent l'app Farfetch (recherche en haut, carrousels larges, tuiles créateurs, boutique en liste de catégories à chevrons + bouton « Afficher N résultats », « Moi » en liste de sections ; newsletter, aide et à propos sont dans « Moi »).

# Parité site / app mobile — tableau des écarts

Règle : l'app doit reprendre le site à l'identique. Un écart n'est retiré que lorsqu'il est repris à l'identique.
Légende : **Oui** = repris ; **Non** = à implémenter ; **?** = à vérifier au code avant de trancher.
Source de la 1re passe : routes `src/app/[locale]/**` et composants `src/components/marketplace/*` (lecture ciblée ; les « ? » seront tranchés à la lecture détaillée de chaque page, groupe par groupe).

## Groupe A — Accueil, en-tête, pied de page, menus
| Page / élément (fichier du site) | Dans l'app |
|---|---|
| Accueil : bandeau héros + titre + bouton catalogue (`[locale]/page.tsx`) | Oui (mobile/home.tsx) |
| Accueil : blocs par catégorie (grille 4/3 + bouton) | Oui (mobile/home.tsx) |
| Accueil : rangées Nouveautés / sélection (ScrollRow) | Oui |
| Accueil : vidéos des artistes (`id="vid"`) | Oui (mobile/home.tsx) |
| Accueil : artistes à la une | Oui |
| Accueil : Newsletter (`newsletter.tsx`) | Oui (mobile/home.tsx) |
| Accueil : bloc Aide (liens `/support/[slug]`) | Oui (mobile/home.tsx) |
| Accueil : bloc À propos | Oui (mobile/home.tsx) |
| Pieds de page : FAQ, contact, CGV, confidentialité, orders, returns, payment, discounts (parrainage/étudiant), about, cookies | Partiel (écran Aide) |
| Gestion des cookies / consentement (`cookie-consent.tsx`) | Non |
| Installer l'app (`install-app.tsx`) | Sans objet (déjà une app) |
| Menu compte (commandes, sécurité, adresses, préférences d'alertes) | Partiel : sécurité (`/account/security`) à vérifier |
| Devenir partenaire (`/fournisseur`, candidature) | Non |
| Sélecteur de langue FR/EN (`flag.tsx`) | Non (FR seulement) |
| Fil d'Ariane | Sans objet mobile (retour) |

## Groupe B — Catalogue, boutique, recherche
| Élément | Dans l'app |
|---|---|
| Recherche + suggestions (`search-box.tsx`) | Oui |
| Filtres / « Affiner » (`refine-sheet.tsx`) | Oui |
| Onglets boutique, catégories, artistes (`/boutique/*`, `shop-tabs.tsx`) | Partiel : `/boutique/categories/nouveautes`, `/decouvrir`, `/[slug]/[view]` à vérifier |
| Annuaire des artistes (`artist-directory.tsx`) | ? |
| Badges Pièce unique / Nouveau sur cartes | Oui |
| Prix approximatif en autre devise (`approx-price.tsx`) | Non |
| Dernières consultations (`recent-views.tsx`) | Non |
| Préférences boutique (`shop-prefs.tsx`, région) | Non |
| Région / pays (`region-panel.tsx`) | Non |

## Groupe C — Fiche produit (`produits/[slug]/page.tsx`)
| Élément | Dans l'app |
|---|---|
| Galerie d'images (zoom) | Partiel (défilement) |
| Partager (`share-button.tsx`) | Non |
| Favori | Oui |
| Lien vers l'artiste | ? |
| Badge catégorie | Oui |
| Prix + équivalent devise | Prix seul |
| Stock (« Plus que n », « Pièce unique ») + édition | Oui |
| Message « Réservée par un autre client » | Non |
| Avis « déjà dans le panier » (`in-cart-notice.tsx`) | Non |
| Sélecteur de taille / variante | Oui (ce lot) |
| Quantité (stock > 1) | Oui |
| « Me prévenir » (alerte) | Oui |
| Aperçu dans une pièce (`room-preview.tsx`) | Non |
| Essayage miroir (`mirror-try-on.tsx`) | Non |
| Réalité augmentée (`ar-viewer.tsx`) | Non (à étudier) |
| Matière, technique, origine, matériaux, dimensions (selon catégorie) | Oui |
| Bloc Authenticité (+ certificat, signature) | Oui |
| Entretien (`care`) | Oui |
| Histoire de la pièce | Oui |
| Livraison / retours | Non |
| « Dans le même univers » (`getRelatedProducts`) | Oui |

## Groupe D — Panier, checkout, commandes
| Élément | Dans l'app |
|---|---|
| Panier : lignes, taille, quantités, retirer | Oui |
| Panier : récapitulatif, livraison, taxes (`cart-view.tsx`) | ? |
| Checkout : adresse, case Enregistrer, autocomplétion, e-mail invité | Oui |
| Retenue de stock / garde de retour (`hold-return-guard.tsx`) | ? |
| Confirmation de commande + adresse (`checkout/confirmation/[number]`) | ? |
| Commandes : liste, détail, suivi colis (`sub-order-tracking.tsx`), statuts | Partiel |
| Annuler / retourner (`cancel-sub-order-button`, `return-request-form`) | Oui |
| Changer l'adresse d'une commande (`order-address-form.tsx`) | Non |

## Groupe E — Compte, favoris, alertes, support
| Élément | Dans l'app |
|---|---|
| Connexion / inscription / mot de passe oublié | Oui |
| Réinitialisation du mot de passe (`reset-password`) | Via e-mail (lien web) |
| Profil (`profile-form.tsx`) et téléphone (`phone-field.tsx`) | ? |
| Sécurité (`account/security`) | ? |
| Adresses : liste, ajout, édition | Oui |
| Favoris (`favorites-list.tsx`) | Oui |
| Préférences d'alertes + désinscription + envoyer un test | Oui (désinscription web) |
| Support `/support/[slug]` + retour utile (`help-feedback.tsx`) | Partiel |
| Tílá (assistant) | Oui |

## Groupe F — Espaces fournisseur et administrateur
`/fournisseur/**` (tableau de bord, œuvres, commandes, stocks, paiements, profil, candidature) et `/admin/**` : **Non** dans l'app.
À valider par l'utilisateur : exception proposée (outils de gestion, usage poste de travail) ou reprise ?

## Impossibles / sans objet sur mobile (à valider)
- Installer l'app (PWA), fil d'Ariane, survol (hover).
- Réalité augmentée (`ar-viewer.tsx`) : possible mais coûteuse ; à décider.

## Drapeaux et indicatif (ajout)
| Page | Élément | Dans l'app |
|---|---|---|
| Adresses / checkout | Champ Pays avec drapeau (CountryField, flagcdn) | Oui (mobile/flags.tsx) |
| Adresses / checkout | Téléphone : sélecteur d'indicatif + drapeau, E.164 (PhoneField) | Oui |
| Inscription / profil | Téléphone | Non : pas de champ téléphone dans l'app, à vérifier sur le site |
| Région / devise | Panneau région avec drapeaux (region-panel.tsx) | Non (voir À valider) |

- Groupes B/D/E : annuaire artistes, arborescence cat�gories, vus r�cemment, ApproxPrice, r�capitulatif panier, confirmation, modification d'adresse de commande, d�tails et s�curit� (nom / mot de passe). Pas de champ t�l�phone � l'inscription sur le site (le t�l�phone est dans les adresses).
