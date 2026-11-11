-- Rattache chaque œuvre sans partenaire à un partenaire actif (répartition en tourniquet).
-- À lancer à la main sur Neon (console SQL), jamais automatiquement au déploiement.
-- Ne touche ni aux commandes ni aux autres tables : seule Product."supplierId" est mise à jour.

-- 1) CONTRÔLE AVANT : œuvres sans partenaire et partenaires actifs disponibles
SELECT count(*) AS oeuvres_sans_partenaire FROM "Product" WHERE "supplierId" IS NULL;
SELECT id, "displayName" FROM "Supplier" WHERE status = 'ACTIVE' ORDER BY "createdAt", id;

-- 2) RATTACHEMENT (sans effet s'il n'existe aucun partenaire actif)
WITH sup AS (
  SELECT id, row_number() OVER (ORDER BY "createdAt", id) - 1 AS n, count(*) OVER () AS total
  FROM "Supplier" WHERE status = 'ACTIVE'
), orph AS (
  SELECT slug, row_number() OVER (ORDER BY "createdAt", slug) - 1 AS n
  FROM "Product" WHERE "supplierId" IS NULL
)
UPDATE "Product" p
SET "supplierId" = sup.id
FROM orph JOIN sup ON sup.n = orph.n % sup.total
WHERE p.slug = orph.slug;

-- 3) CONTRÔLE APRÈS : doit renvoyer 0, puis la répartition par partenaire
SELECT count(*) AS oeuvres_sans_partenaire FROM "Product" WHERE "supplierId" IS NULL;
SELECT s."displayName", count(*) AS oeuvres FROM "Product" p JOIN "Supplier" s ON s.id = p."supplierId" GROUP BY s."displayName" ORDER BY 2 DESC;
