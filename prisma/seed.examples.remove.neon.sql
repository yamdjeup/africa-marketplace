-- E póm ta’ — retire le jeu d'exemple (Miroir). Généré par `npm run db:seed-examples-sql`.
BEGIN;
DELETE FROM "OrderItem" WHERE "productSlug" IN ('exemple-boucles-anneau-goutte', 'exemple-collier-perles-pendentif', 'exemple-haut-toile-cuir', 'exemple-veste-longue-tie-dye', 'exemple-ceinture-cuir-poches', 'exemple-veste-verte-chevrons', 'exemple-haut-bandes-kente');
DELETE FROM "Product" WHERE "slug" IN ('exemple-boucles-anneau-goutte', 'exemple-collier-perles-pendentif', 'exemple-haut-toile-cuir', 'exemple-veste-longue-tie-dye', 'exemple-ceinture-cuir-poches', 'exemple-veste-verte-chevrons', 'exemple-haut-bandes-kente');
DELETE FROM "Creator" WHERE "slug" = 'exemple';
COMMIT;
