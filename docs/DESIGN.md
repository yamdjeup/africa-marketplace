# Design — E póm ta’ (POC)

## 1. Identité de marque
Galerie en ligne d'artistes plasticiens afrodescendants ; marque **E póm ta’** (« tu es très belle » en ghomálá’ ; accent aigu sur le o et apostrophe typographique ’ à respecter exactement). Playfair Display et Inter (sous-ensemble latin) affichent ó et ’ correctement (vérifié par tests e2e sur le titre de page et l'en-tête). La signification apparaît en sous-titre du logo et dans la section « E póm ta’ » de l'accueil (FR/EN). Un bandeau « Démonstration privée » discret surmonte l'en-tête. Les œuvres sont présentées en grand format, avec crédit artiste, prix fictif signalé et pièce unique (quantité 1). Ton : élégant, éditorial, chaleureux, authentique. Les motifs (wax, kente, bogolan) servent d'accents — jamais de fond saturé — pour laisser vivre les œuvres.

## 2. Palette
Définie dans `src/app/globals.css` (variables CSS shadcn + tokens Tailwind).

| Rôle | Token | Inspiration | Usage |
|---|---|---|---|
| Primaire | `primary` (indigo profond) | Indigo wax / bogolan | Actions principales, liens, pied de page |
| Accent | `accent` (or/ocre) | Kente | Mises en avant, anneaux, badges |
| Terracotta | `terracotta` | Terre, bogolan | Titres secondaires, survols |
| Vert kente | `kente` | Kente | Succès, disponibilité |
| Fond | `background` (écru chaud) | Coton brut | Fond des pages |
| Texte | `foreground` (brun encre) | Encre | Texte (contraste ≥ 4.5:1 sur le fond) |
| Bordures | `border`, `muted` | Sable | Séparateurs, surfaces douces |

Motif signature : bandeau `kente-band` (bandes ocre / indigo / vert / terracotta) en filet fin sous l'en-tête et au-dessus du pied de page.

## 3. Typographies
- **Titres** : Playfair Display (serif éditorial) — classe `font-heading`.
- **Texte et UI** : Inter (sans-serif lisible) — `font-sans`.
- Chargées via `next/font/google` (`src/app/layout.tsx`).

## 4. Principes UX mobile-first
1. Conçu pour 360 px d'abord, puis `md`/`lg`.
2. Zones tactiles ≥ 44 px ; actions principales à portée du pouce.
3. Grille produits 2 colonnes sur mobile, 4 sur desktop.
4. Visuels larges (ratio 4:5), prix en EUR toujours visible.
5. Accessibilité : contraste AA, focus visible, libellés ARIA, `lang` FR/EN.
6. Performance : images optimisées, polices limitées, peu de JS client.
7. Parcours court : accueil → catalogue → produit → panier → paiement test.

## 5. Composants
- **shadcn/ui** : Button, Card, Badge, Separator (autres ajoutés au besoin : Input, Select, Sheet, Dialog, Tabs).
- **Marketplace** (`src/components/marketplace/`) : `SiteHeader`, `SiteFooter`, `ProductCard`, `CreatorCard`.
- À venir : galerie produit, sélecteur de variante, filtres, ligne de panier, formulaire checkout.

## 6. Pages clés
Accueil · Catalogue (filtres, tri, recherche) · Fiche produit · Fiche créateur · Panier · Checkout (Stripe test) · Back-office vendeur · `/design` (vitrine des composants, déjà disponible).

## 7. Socle technique
Next.js (App Router, TypeScript), Tailwind CSS v4, shadcn/ui. Lancer : `npm install`, `npm run dev`, puis ouvrir `/design`. Aucune logique métier ni base de données à ce stade ; `.env*` est ignoré.
