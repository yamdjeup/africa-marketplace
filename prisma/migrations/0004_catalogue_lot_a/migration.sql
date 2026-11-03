-- Lot A catalogue : champs optionnels par forme d'art, ordre des catégories, nouvelles catégories.
-- Additif : aucune colonne supprimée ; les œuvres existantes sont reclassées.

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "material" TEXT,
ADD COLUMN     "materialEn" TEXT,
ADD COLUMN     "technique" TEXT,
ADD COLUMN     "techniqueEn" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "countryEn" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "regionEn" TEXT,
ADD COLUMN     "widthCm" DOUBLE PRECISION,
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "depthCm" DOUBLE PRECISION,
ADD COLUMN     "careInstructions" TEXT,
ADD COLUMN     "careInstructionsEn" TEXT,
ADD COLUMN     "hasCertificate" BOOLEAN NOT NULL DEFAULT true;

-- Nouvelles catégories (idempotent) puis reclassement des œuvres existantes.
INSERT INTO "Category" ("slug", "name", "nameEn", "sortOrder") VALUES
  ('peinture', 'Peinture', 'Painting', 1),
  ('sculpture', 'Sculpture', 'Sculpture', 2),
  ('couture-mode', 'Couture et mode', 'Fashion and tailoring', 3),
  ('bijoux', 'Bijoux', 'Jewellery', 4),
  ('textile-decoration', 'Textile et décoration', 'Textiles and home decor', 5),
  ('photographie', 'Photographie', 'Photography', 6)
ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name", "nameEn" = EXCLUDED."nameEn", "sortOrder" = EXCLUDED."sortOrder";

UPDATE "Product" SET "categorySlug" = 'sculpture' WHERE "categorySlug" = 'sculpture-ceramique';
UPDATE "Product" SET "categorySlug" = 'peinture' WHERE "categorySlug" = 'dessin';
DELETE FROM "Category" WHERE "slug" IN ('sculpture-ceramique', 'dessin');
