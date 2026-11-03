-- E póm ta’ — retire le jeu d'exemple (Miroir). Généré par `npm run db:seed-examples-sql`.
BEGIN;
DELETE FROM "OrderItem" WHERE "productSlug" IN ('exemple-imane-ayissi-veste-tie-dye', 'exemple-ldm-hao-set', 'exemple-lozama-akara-belt', 'exemple-lozama-neitha-harness', 'exemple-haut-bandes-kente', 'exemple-boucles-anneau-goutte', 'exemple-collier-perles-pendentif', 'exemple-haut-toile-cuir', 'exemple-ceinture-cuir-poches', 'exemple-veste-longue-tie-dye', 'exemple-veste-verte-chevrons');
DELETE FROM "Product" WHERE "slug" IN ('exemple-imane-ayissi-veste-tie-dye', 'exemple-ldm-hao-set', 'exemple-lozama-akara-belt', 'exemple-lozama-neitha-harness', 'exemple-haut-bandes-kente', 'exemple-boucles-anneau-goutte', 'exemple-collier-perles-pendentif', 'exemple-haut-toile-cuir', 'exemple-ceinture-cuir-poches', 'exemple-veste-longue-tie-dye', 'exemple-veste-verte-chevrons');
DELETE FROM "Creator" WHERE "slug" IN ('imane-ayissi', 'ldm-look-different-marque', 'loza-maleombho', 'exemple');
COMMIT;
