-- Pivot galerie d'art : suppression des champs géographiques et du prix local, ajout de la source de biographie.
-- Les données couture (et les commandes de démonstration qui y renvoient) sont supprimées ; le seed réinsère les œuvres.
DELETE FROM "OrderItem";
DELETE FROM "Order";
DELETE FROM "Product";
DELETE FROM "Creator";
DELETE FROM "Category";

-- AlterTable
ALTER TABLE "Creator" DROP COLUMN "country",
DROP COLUMN "countryEn",
DROP COLUMN "city",
ADD COLUMN     "sourceUrl" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "localCurrency",
DROP COLUMN "localAmount",
DROP COLUMN "country",
DROP COLUMN "countryEn",
DROP COLUMN "city";
